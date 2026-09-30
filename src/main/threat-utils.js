/**
 * Модуль обробки та форматування характеру загроз (Anti-Tautology Formatter).
 * Усуває тавтологію (дублювання слів "жовтий рівень", "загроза", "небезпека")
 * та формує лаконічні й природні підписи для UI, трею та нативних сповіщень.
 */

/**
 * Очищує сирий текст повідомлення від дублюючих суфіксів рівня та надлишкових символів.
 * @param {string|null} msg
 * @returns {string}
 */
function cleanSourceMessage(msg) {
  if (!msg || typeof msg !== 'string') return '';

  let cleaned = msg
    // Видаляємо суфікси рівня у дужках: (жовтий рівень), (червоний рівень)
    .replace(/\s*\((?:жовтий|червоний)\s+рівень\)/gi, '')
    // Видаляємо зовнішні квадратні дужки, якщо вони були в повідомленні
    .replace(/^\[\s*|\s*\]$/g, '')
    .trim();

  // Прибираємо подвійні пробіли
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  return cleaned;
}

/**
 * Словник метаданих для відомих типів загроз.
 */
const THREAT_DEFINITIONS = {
  drones: {
    icon: 'drone',
    shortLabel: 'Дронова загроза',
    fullLabel: 'Дронова загроза',
    notificationDesc: 'Загроза ударних БПЛА. Оцініть безпекову ситуацію.'
  },
  unspecified_missiles: {
    icon: 'missile',
    shortLabel: 'Ракетна загроза',
    fullLabel: 'Ракетна загроза',
    notificationDesc: 'Загроза ракетного удару. Негайно прямуйте в укриття!'
  },
  ballistic: {
    icon: 'ballistic',
    shortLabel: 'Загроза балістики',
    fullLabel: 'Загроза балістичного озброєння',
    notificationDesc: 'Загроза застосування балістичного озброєння!'
  },
  guided_bombs: {
    icon: 'aviation',
    shortLabel: 'Загроза пусків КАБ',
    fullLabel: 'Загроза керованих авіабомб',
    notificationDesc: 'Пуски керованих авіабомб. Пройдіть в укриття!'
  },
  tactical_aviation: {
    icon: 'aviation',
    shortLabel: 'Загроза тактичної авіації',
    fullLabel: 'Активність тактичної авіації',
    notificationDesc: 'Активність ворожої тактичної авіації біля кордонів.'
  },
  artillery: {
    icon: 'artillery',
    shortLabel: 'Загроза артобстрілу',
    fullLabel: 'Загроза артобстрілу',
    notificationDesc: 'Загроза артилерійського обстрілу. Перебувайте в укриттях!'
  },
  chemical: {
    icon: 'chemical',
    shortLabel: 'Хімічна загроза',
    fullLabel: 'Хімічна небезпека',
    notificationDesc: 'Загроза хімічного ураження. Дотримуйтесь інструкцій захисту!'
  },
  nuclear: {
    icon: 'nuclear',
    shortLabel: 'Радіаційна загроза',
    fullLabel: 'Радіаційна небезпека',
    notificationDesc: 'Радіаційна загроза. Перейдіть у захисні споруди!'
  }
};

// Аліаси для гнучкого зіставлення
THREAT_DEFINITIONS.drone = THREAT_DEFINITIONS.drones;
THREAT_DEFINITIONS.missile = THREAT_DEFINITIONS.unspecified_missiles;
THREAT_DEFINITIONS.missiles = THREAT_DEFINITIONS.unspecified_missiles;
THREAT_DEFINITIONS.aviation = THREAT_DEFINITIONS.tactical_aviation;

const THREAT_PRIORITIES = {
  ballistic: 60,
  missile: 50,
  aviation: 40,
  artillery: 30,
  chemical: 20,
  nuclear: 20,
  drone: 10,
  alert: 5,
  safe: 0
};

/**
 * Форматує повний об'єкт інформації про загрозу без тавтології.
 *
 * @param {Array} threats Масив об'єктів threats від alerts.in.ua
 * @param {string} alertType Базовий тип тривоги ('air_raid', 'artillery_shelling' тощо)
 * @param {string} alertLevel Рівень небезпеки ('yellow', 'red', 'none')
 * @returns {Object} Нормалізований об'єкт характеру загрози
 */
function formatThreatInfo(threats, alertType = 'air_raid', alertLevel = 'none') {
  const hasThreatsArray = Array.isArray(threats) && threats.length > 0;
  const isYellow = alertLevel === 'yellow';

  // Якщо активна артилерія за базовим типом
  if (alertType === 'artillery_shelling') {
    return {
      hasThreats: true,
      threatType: 'artillery',
      iconType: 'artillery',
      iconTypes: ['artillery'],
      isCombined: false,
      level: 'artillery',
      badgeLabel: 'Загроза артобстрілу',
      fullLabel: 'Загроза артобстрілу',
      tooltipSuffix: 'Загроза артобстрілу',
      notificationText: 'Загроза артилерійського обстрілу. Перебувайте в укриттях!'
    };
  }

  // Якщо масив threats порожній
  if (!hasThreatsArray) {
    if (isYellow) {
      return {
        hasThreats: true,
        threatType: 'drones',
        iconType: 'drone',
        iconTypes: ['drone'],
        isCombined: false,
        level: 'yellow',
        badgeLabel: 'Дронова загроза',
        fullLabel: 'Дронова загроза',
        tooltipSuffix: 'Дронова загроза',
        notificationText: 'Дронова загроза. Оцініть безпекову ситуацію.'
      };
    }

    if (alertType === 'air_raid' && alertLevel === 'red') {
      return {
        hasThreats: false,
        threatType: 'air_raid',
        iconType: 'alert',
        iconTypes: ['alert'],
        isCombined: false,
        level: 'red',
        badgeLabel: 'Повітряна тривога',
        fullLabel: 'Повітряна тривога',
        tooltipSuffix: 'Повітряна тривога',
        notificationText: 'Повітряна тривога. Негайно пройдіть в найближче укриття!'
      };
    }

    return {
      hasThreats: false,
      threatType: 'none',
      iconType: 'safe',
      iconTypes: ['safe'],
      isCombined: false,
      level: 'none',
      badgeLabel: '',
      fullLabel: '',
      tooltipSuffix: '',
      notificationText: ''
    };
  }

  // Обробка наявного масиву threats
  const distinctTypes = [];
  const distinctLabels = [];
  const distinctIcons = [];
  let primaryDef = null;
  let primaryThreatType = null;
  let primarySourceMsg = '';

  for (const t of threats) {
    const rawType = (t.threat_type || '').toLowerCase().trim();
    const sourceMsg = cleanSourceMessage(t.source_message);

    if (!primarySourceMsg && sourceMsg) {
      primarySourceMsg = sourceMsg;
    }

    // Зіставлення за типом
    let matchedDef = THREAT_DEFINITIONS[rawType];

    // Якщо тип невідомий, шукаємо ключові слова у source_message
    if (!matchedDef && sourceMsg) {
      const lower = sourceMsg.toLowerCase();
      if (lower.includes('дрон') || lower.includes('бпла') || lower.includes('шахед')) {
        matchedDef = THREAT_DEFINITIONS.drones;
      } else if (lower.includes('баліст')) {
        matchedDef = THREAT_DEFINITIONS.ballistic;
      } else if (lower.includes('каб') || lower.includes('бомб')) {
        matchedDef = THREAT_DEFINITIONS.guided_bombs;
      } else if (lower.includes('ракет')) {
        matchedDef = THREAT_DEFINITIONS.unspecified_missiles;
      } else if (lower.includes('авіац')) {
        matchedDef = THREAT_DEFINITIONS.tactical_aviation;
      } else if (lower.includes('арт')) {
        matchedDef = THREAT_DEFINITIONS.artillery;
      }
    }

    if (!matchedDef) {
      matchedDef = {
        icon: isYellow ? 'drone' : 'missile',
        shortLabel: isYellow ? 'Дронова загроза' : 'Ракетна загроза',
        fullLabel: sourceMsg || (isYellow ? 'Дронова загроза' : 'Ракетна загроза'),
        notificationDesc: isYellow ? THREAT_DEFINITIONS.drones.notificationDesc : THREAT_DEFINITIONS.unspecified_missiles.notificationDesc
      };
    }

    if (!primaryDef) {
      primaryDef = matchedDef;
      primaryThreatType = rawType || matchedDef.icon;
    }

    if (!distinctIcons.includes(matchedDef.icon)) {
      distinctIcons.push(matchedDef.icon);
    }

    if (!distinctTypes.includes(matchedDef.shortLabel)) {
      distinctTypes.push(matchedDef.shortLabel);
      distinctLabels.push(matchedDef.fullLabel);
    }
  }

  // Сортуємо унікальні іконки за спаданням пріоритету небезпеки (ракети/балістика перед дронами)
  distinctIcons.sort((a, b) => (THREAT_PRIORITIES[b] || 0) - (THREAT_PRIORITIES[a] || 0));

  // Визначення комбінованої загрози
  const isCombined = distinctIcons.length > 1;
  let primaryIcon = distinctIcons[0] || 'alert';

  // Якщо одночасно ракети (або балістика) та дрони — використовуємо спеціальний комбо-значок
  if (isCombined && (distinctIcons.includes('missile') || distinctIcons.includes('ballistic')) && distinctIcons.includes('drone')) {
    primaryIcon = 'combo_missile_drone';
  }

  // Формуємо комбінований підпис, якщо декілька загроз
  let badgeLabel = distinctTypes.join(', ');
  if (distinctTypes.includes('Ракетна загроза') && distinctTypes.includes('Дронова загроза')) {
    badgeLabel = 'Ракетна та дронова загроза';
  }

  const fullLabel = primarySourceMsg || distinctLabels.join(', ');
  const tooltipSuffix = badgeLabel;

  // Формуємо лаконічне повідомлення для Windows Notification
  const notifDesc = (primaryDef && primaryDef.notificationDesc)
    ? primaryDef.notificationDesc
    : (isYellow ? THREAT_DEFINITIONS.drones.notificationDesc : THREAT_DEFINITIONS.unspecified_missiles.notificationDesc);
  const notificationText = `${badgeLabel}. ${notifDesc}`;

  return {
    hasThreats: true,
    threatType: primaryThreatType,
    iconType: primaryIcon,
    iconTypes: distinctIcons,
    isCombined,
    level: isYellow ? 'yellow' : 'red',
    badgeLabel,
    fullLabel,
    tooltipSuffix,
    notificationText
  };
}

module.exports = {
  cleanSourceMessage,
  formatThreatInfo,
  THREAT_DEFINITIONS
};
