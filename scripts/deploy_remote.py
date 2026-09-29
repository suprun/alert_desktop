"""
Скрипт автоматизованого розгортання проксі-сервера на віддаленому сервері Ubuntu через SSH.
Використовує бібліотеку paramiko для SFTP-передачі та виконання команд із підвищенням прав (sudo).
"""

import os
import sys
import time
from pathlib import Path
import paramiko
import urllib.request
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def load_server_env(env_path: Path) -> dict:
    """Зчитує конфігурацію сервера з файлу .env."""
    config = {
        "ip": "",
        "user": "",
        "password": "",
        "UKRALARM_API_TOKEN": "",
        "ALERTS_API_TOKEN": "",
        "ALERTS_IN_UA_URL": "https://api.alerts.in.ua/v1/alerts/active.json",
        "ALERTS_IN_UA_POLL_INTERVAL": "8",
        "UPSTREAM_API_URL": "https://api.ukrainealarm.com",
        "PUBLIC_WEBHOOK_URL": "https://api.applink.pp.ua/api/v3/webhook",
        "RESYNC_INTERVAL_SECONDS": "300",
        "SERVER_HOST": "0.0.0.0",
        "SERVER_PORT": "8080",
        "LOG_LEVEL": "INFO",
    }

    if not env_path.exists():
        raise FileNotFoundError(f"Файл конфігурації не знайдено: {env_path}")

    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                config[key.strip()] = val.strip()

    return config


def run_sudo_command(client: paramiko.SSHClient, password: str, command: str) -> tuple[int, str, str]:
    """Виконує команду на віддаленому сервері з правами sudo."""
    sudo_cmd = f"sudo -S -p '' bash -c {command!r}"
    stdin, stdout, stderr = client.exec_command(sudo_cmd, get_pty=True)
    stdin.write(f"{password}\n")
    stdin.flush()

    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    exit_status = stdout.channel.recv_exit_status()
    return exit_status, out, err


def main():
    repo_root = Path(__file__).resolve().parent.parent
    server_dir = repo_root / "server"
    env_path = server_dir / ".env"

    print("==================================================================")
    print(" Автоматизоване розгортання Alerts Proxy на віддалений сервер")
    print("==================================================================")

    cfg = load_server_env(env_path)
    host = cfg.get("ip")
    user = cfg.get("user")
    password = cfg.get("password")
    ukralarm_token = cfg.get("UKRALARM_API_TOKEN")
    aiu_token = cfg.get("ALERTS_API_TOKEN")
    port = cfg.get("SERVER_PORT", "8080")

    if not host or not user or not password:
        print("Помилка: У файлі server/.env відсутні параметри ip, user або password.")
        sys.exit(1)

    if not ukralarm_token:
        print("Помилка: У файлі server/.env не задано UKRALARM_API_TOKEN.")
        sys.exit(1)

    if not aiu_token:
        print("Помилка: У файлі server/.env не задано ALERTS_API_TOKEN (alerts.in.ua).")
        sys.exit(1)

    print(f"[*] Підключення до {user}@{host}:22...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(
            hostname=host,
            port=22,
            username=user,
            password=password,
            timeout=15,
            allow_agent=False,
            look_for_keys=False
        )
        print("[+] SSH-з'єднання успішно встановлено.")
    except Exception as e:
        print(f"[-] Не вдалося підключитися через SSH: {e}")
        sys.exit(1)

    try:
        # 1. Перевірка sudo
        print("[*] Перевірка прав sudo...")
        code, out, _ = run_sudo_command(client, password, "whoami")
        if code != 0 or "root" not in out:
            print(f"[-] Помилка прав sudo: {out}")
            sys.exit(1)
        print("[+] Права sudo підтверджено.")

        # 2. Встановлення базових пакетів
        print("[*] Перевірка та очищення завислих процесів блокування apt/dpkg...")
        clean_locks_cmd = (
            "killall -9 apt apt-get dpkg 2>/dev/null || true; "
            "rm -f /var/lib/dpkg/lock /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock /var/cache/apt/archives/lock"
        )
        run_sudo_command(client, password, clean_locks_cmd)

        print("[*] Налаштування оточення apt (tzdata) та встановлення python3-venv, python3-pip, curl...")
        fix_dpkg_cmd = (
            "export DEBIAN_FRONTEND=noninteractive && "
            "export TZ=Etc/UTC && "
            "ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime && "
            "echo 'tzdata tzdata/Areas select Etc' | debconf-set-selections && "
            "echo 'tzdata tzdata/Zones/Etc select UTC' | debconf-set-selections && "
            "dpkg --configure -a || true"
        )
        run_sudo_command(client, password, fix_dpkg_cmd)

        install_cmd = (
            "export DEBIAN_FRONTEND=noninteractive && "
            "apt-get update -qq && "
            "apt-get install -y -qq --no-install-recommends python3 python3-venv python3-pip curl ufw"
        )
        code, out, err = run_sudo_command(client, password, install_cmd)
        if code != 0:
            # Спроба повторної конфігурації пакетів при попередньому перериванні
            run_sudo_command(client, password, "dpkg --configure -a")
            code, out, err = run_sudo_command(client, password, install_cmd)
            if code != 0:
                print(f"[-] Помилка встановлення системних пакетів:\n{out}\n{err}")
                sys.exit(1)
        print("[+] Системні пакети оновлено.")

        # 3. Підготовка директорії передачі
        remote_tmp = "/tmp/alert_proxy_upload"
        client.exec_command(f"rm -rf {remote_tmp} && mkdir -p {remote_tmp}")
        
        print("[*] Завантаження файлів проєкту через SFTP...")
        sftp = client.open_sftp()

        files_to_upload = [
            ("requirements.txt", server_dir / "requirements.txt"),
            ("config.py", server_dir / "config.py"),
            ("proxy_service.py", server_dir / "proxy_service.py"),
            ("main.py", server_dir / "main.py"),
            ("alert-proxy.service", server_dir / "systemd" / "alert-proxy.service"),
        ]

        for r_name, local_path in files_to_upload:
            remote_path = f"{remote_tmp}/{r_name}"
            sftp.put(str(local_path), remote_path)
            print(f"  -> Завантажено {r_name}")

        # Створення чистого бойового .env для сервера (без SSH-паролів)
        prod_env_content = (
            f"UKRALARM_API_TOKEN={ukralarm_token}\n"
            f"ALERTS_API_TOKEN={aiu_token}\n"
            f"ALERTS_IN_UA_URL={cfg.get('ALERTS_IN_UA_URL', 'https://api.alerts.in.ua/v1/alerts/active.json')}\n"
            f"ALERTS_IN_UA_POLL_INTERVAL={cfg.get('ALERTS_IN_UA_POLL_INTERVAL', '8')}\n"
            f"UPSTREAM_API_URL={cfg.get('UPSTREAM_API_URL', 'https://api.ukrainealarm.com')}\n"
            f"PUBLIC_WEBHOOK_URL={cfg.get('PUBLIC_WEBHOOK_URL', f'http://{host}:{port}/api/v3/webhook')}\n"
            f"RESYNC_INTERVAL_SECONDS={cfg.get('RESYNC_INTERVAL_SECONDS', '300')}\n"
            f"SERVER_HOST={cfg.get('SERVER_HOST', '0.0.0.0')}\n"
            f"SERVER_PORT={port}\n"
            f"LOG_LEVEL={cfg.get('LOG_LEVEL', 'INFO')}\n"
        )
        with sftp.file(f"{remote_tmp}/.env", "w") as f:
            f.write(prod_env_content)
        print("  -> Створено чистий бойовий .env для сервера")

        sftp.close()

        # 4. Переміщення у /opt/alert_proxy та налаштування оточення
        print("[*] Розгортання у /opt/alert_proxy та налаштування Python venv...")
        deploy_cmd = (
            "mkdir -p /opt/alert_proxy && "
            f"cp -a {remote_tmp}/. /opt/alert_proxy/ && "
            f"rm -rf {remote_tmp} && "
            "if [ ! -d /opt/alert_proxy/venv ]; then python3 -m venv /opt/alert_proxy/venv; fi && "
            "/opt/alert_proxy/venv/bin/pip install --upgrade pip -q && "
            "/opt/alert_proxy/venv/bin/pip install -r /opt/alert_proxy/requirements.txt -q && "
            "chmod 600 /opt/alert_proxy/.env && "
            "chown -R www-data:www-data /opt/alert_proxy"
        )
        code, out, err = run_sudo_command(client, password, deploy_cmd)
        if code != 0:
            print(f"[-] Помилка налаштування Python-оточення:\n{out}\n{err}")
            sys.exit(1)
        print("[+] Python venv та залежності успішно встановлено.")

        # 5. Реєстрація та запуск systemd служби
        print("[*] Реєстрація та перезапуск служби alert-proxy...")
        service_cmd = (
            "cp /opt/alert_proxy/alert-proxy.service /etc/systemd/system/alert-proxy.service && "
            "systemctl daemon-reload && "
            "systemctl enable alert-proxy && "
            "systemctl restart alert-proxy"
        )
        code, out, err = run_sudo_command(client, password, service_cmd)
        if code != 0:
            print(f"[-] Помилка запуску служби:\n{out}\n{err}")
            sys.exit(1)
        print("[+] Службу alert-proxy зареєстровано та запущено.")

        # 6. Налаштування фаєрволу UFW
        print(f"[*] Перевірка відкриття порту {port} у фаєрволі...")
        run_sudo_command(client, password, f"ufw allow {port}/tcp || true")

        # 7. Очікування старту та перевірка на сервері
        print("[*] Очікування ініціалізації першого опитування (5 сек)...")
        time.sleep(5)

        code, status_out, _ = run_sudo_command(client, password, "systemctl status alert-proxy --no-pager -n 8")
        print("\n--- СТАТУС СЛУЖБИ SYSTEMD ---")
        print(status_out.strip())
        print("-----------------------------\n")

        # Внутрішній curl на сервері
        _, curl_out, _ = run_sudo_command(client, password, f"curl -s http://127.0.0.1:{port}/health")
        print(f"[*] Внутрішня перевірка http://127.0.0.1:{port}/health:\n{curl_out.strip()}")

    finally:
        client.close()

    # 8. Зовнішня перевірка з локального ПК
    print("\n[*] Зовнішнє тестування доступності сервісу з вашого комп'ютера...")
    test_health_url = f"http://{host}:{port}/health"
    test_alerts_url = f"http://{host}:{port}/v1/alerts/active.json"

    try:
        req = urllib.request.Request(test_health_url, headers={"User-Agent": "alert_desktop_deployer/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[+] ЗОВНІШНЯ ПЕРЕВІРКА УСПІШНА! Статус: {data.get('status')}")
            print(f"    - Активних тривог: {data.get('active_alerts_count')}")
            print(f"    - Uptime: {data.get('uptime_seconds')} сек")
            ua_info = data.get('ukrainealarm', {})
            aiu_info = data.get('alerts_in_ua', {})
            print(f"    - UkraineAlarm Webhook зареєстровано: {ua_info.get('webhook_registered')}")
            print(f"    - alerts.in.ua кешовано загроз: {aiu_info.get('threats_cached_count')}")
    except Exception as e:
        print(f"[!] Увага: Не вдалося зробити зовнішній запит до {test_health_url}: {e}")
        print("    Можливо, порт заблоковано зовнішнім фаєрволом хостинг-провайдера (Security Group).")

    print("\n==================================================================")
    print(" РОЗГОРТАННЯ УСПІШНО ЗАВЕРШЕНО!")
    print("==================================================================")
    print("Адреса для десктопного додатка alert_desktop:")
    print(f"  {test_alerts_url}")
    print("==================================================================")


if __name__ == "__main__":
    main()
