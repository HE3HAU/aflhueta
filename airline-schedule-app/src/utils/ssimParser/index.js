/**
 * Улучшенный парсер SSIM-файлов с корректной обработкой периодов
 */

/**
 * Парсит SSIM-файл и возвращает структурированные данные о рейсах
 * @param {string} content - Содержимое SSIM-файла
 * @returns {Object} Объект с данными о рейсах
 */
export const parseSSIMFile = (content) => {
  try {
    console.log(`Начало парсинга SSIM-файла`);
    
    // Разбиваем файл на строки и отфильтровываем пустые
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    console.log(`Всего строк в файле: ${lines.length}`);
    
    // Парсинг файла
    const parsedData = parseSSIMContent(lines);
    console.log(`Парсинг завершен, обнаружено ${parsedData.flightLegs.length} рейсов`);
    
    // Преобразование результатов в формат, понятный нашему приложению
    const flights = transformData(parsedData);
    
    return {
      success: true,
      flights,
      stats: {
        totalFlights: flights.length,
        parsed: lines.length
      }
    };
  } catch (error) {
    console.error('Ошибка при парсинге SSIM-файла:', error);
    return {
      success: false,
      error: error.message,
      flights: []
    };
  }
};

/**
 * Парсит содержимое SSIM-файла
 * @param {Array} lines - Массив строк файла
 * @returns {Object} Структурированные данные
 */
const parseSSIMContent = (lines) => {
  const result = {
    header: null,
    carrier: null,
    flightLegs: []
  };
  
  // Определяем глобальный период для заполнения недостающих данных
  const globalPeriod = detectGlobalPeriod(lines);
  console.log(`Определен глобальный период: ${globalPeriod.startDate} - ${globalPeriod.endDate}`);
  
  lines.forEach(line => {
    const recordType = line.charAt(0);
    
    switch(recordType) {
      case '1': // Заголовок файла
        result.header = parseHeaderRecord(line);
        break;
      case '2': // Информация о перевозчике
        result.carrier = parseCarrierRecord(line);
        break;
      case '3': // Информация о рейсе
        const flightLeg = parseFlightLegRecord(line, globalPeriod);
        if (flightLeg) {
          result.flightLegs.push(flightLeg);
        }
        break;
    }
  });
  
  return result;
};

/**
 * Определяет глобальный период на основе всех строк SSIM
 * @param {Array<string>} lines - Строки SSIM-файла
 * @returns {Object} Глобальный период (startDate, endDate)
 */
const detectGlobalPeriod = (lines) => {
  const validDates = [];
  
  for (const line of lines) {
    try {
      if (line.length < 28 || line.charAt(0) !== '3') continue;
      
      const startDateStr = line.substring(14, 21).trim();
      const endDateStr = line.substring(21, 28).trim();
      
      const startDate = parseSSIMDate(startDateStr);
      const endDate = parseSSIMDate(endDateStr);
      
      if (startDate && endDate) {
        validDates.push({ startDate, endDate });
      }
    } catch (error) {
      // Игнорируем ошибки при определении периода
    }
  }
  
  // Если не нашли валидных периодов, создаем дефолтный
  if (validDates.length === 0) {
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    console.log('Не удалось определить глобальный период, используем текущий месяц');
    
    return {
      startDate: today.toISOString().split('T')[0],
      endDate: oneMonthLater.toISOString().split('T')[0]
    };
  }
  
  // Находим минимальную и максимальную даты
  let minStartDate = validDates[0].startDate;
  let maxEndDate = validDates[0].endDate;
  
  for (const { startDate, endDate } of validDates) {
    if (startDate < minStartDate) {
      minStartDate = startDate;
    }
    
    if (endDate > maxEndDate) {
      maxEndDate = endDate;
    }
  }
  
  // Если конец оказался раньше начала, используем сегодняшний день + 30 дней
  if (minStartDate > maxEndDate) {
    console.warn('Ошибка в глобальном периоде: начало после конца');
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    return {
      startDate: today.toISOString().split('T')[0],
      endDate: oneMonthLater.toISOString().split('T')[0]
    };
  }
  
  console.log(`Определен глобальный период: ${minStartDate.toISOString().split('T')[0]} - ${maxEndDate.toISOString().split('T')[0]}`);
  
  return {
    startDate: minStartDate.toISOString().split('T')[0],
    endDate: maxEndDate.toISOString().split('T')[0]
  };
};

/**
 * Парсит запись заголовка файла (тип 1)
 * @param {string} line - Строка с заголовком
 * @returns {Object} Данные заголовка
 */
const parseHeaderRecord = (line) => {
  return {
    title: line.substring(1, 30).trim(),
    creationDate: line.substring(30, 37).trim()
  };
};

/**
 * Парсит запись перевозчика (тип 2)
 * @param {string} line - Строка с информацией о перевозчике
 * @returns {Object} Данные перевозчика
 */
const parseCarrierRecord = (line) => {
  if (line.length < 25) {
    console.warn('Некорректная строка перевозчика:', line);
    return {
      airlineDesignator: line.substring(1, 3).trim(),
      periodFrom: '',
      periodTo: ''
    };
  }
  
  const airlineDesignator = line.substring(1, 3).trim();
  const periodFromStr = line.substring(11, 18).trim();
  const periodToStr = line.substring(18, 25).trim();
  
  return {
    airlineDesignator,
    periodFrom: formatDate(periodFromStr),
    periodTo: formatDate(periodToStr)
  };
};

/**
 * Парсит запись рейса (тип 3)
 * @param {string} line - Строка с информацией о рейсе
 * @param {Object} globalPeriod - Глобальный период для исправления ошибок
 * @returns {Object} Данные рейса
 */
const parseFlightLegRecord = (line, globalPeriod) => {
  try {
    if (line.length < 75) {
      console.warn('Недостаточная длина строки:', line);
      return null;
    }
    
    const airlineDesignator = line.substring(2, 5).trim();
    const flightNumber = line.substring(5, 9).trim();
    
    // Даты и дни выполнения
    const startDateStr = line.substring(14, 21).trim();
    const endDateStr = line.substring(21, 28).trim();
    
    // Парсинг дат с валидацией
    let startDate = parseSSIMDate(startDateStr);
    let endDate = parseSSIMDate(endDateStr);
    
    // Проверка и исправление дат
    let periodValid = true;
    
    if (!startDate) {
      console.warn(`Некорректная дата начала для рейса ${airlineDesignator}${flightNumber}: ${startDateStr}`);
      periodValid = false;
    }
    
    if (!endDate) {
      console.warn(`Некорректная дата окончания для рейса ${airlineDesignator}${flightNumber}: ${endDateStr}`);
      periodValid = false;
    }
    
    // Проверка последовательности дат
    if (startDate && endDate && startDate > endDate) {
      console.warn(`Некорректный период для рейса ${airlineDesignator}${flightNumber}: начало (${startDateStr}) после конца (${endDateStr})`);
      // Меняем даты местами
      [startDate, endDate] = [endDate, startDate];
    }
    
    // Если даты невалидны, используем глобальный период
    if (!periodValid) {
      startDate = new Date(globalPeriod.startDate);
      endDate = new Date(globalPeriod.endDate);
    }
    
    const daysOfOperation = line.substring(28, 35).trim();
    
    // Данные вылета и прилета
    const departureAirport = line.substring(36, 39).trim();
    const departureTime = line.substring(39, 43).trim();
    const departureUtcOffset = line.substring(43, 48).trim();
    
    const arrivalAirport = line.substring(54, 57).trim();
    const arrivalTime = line.substring(57, 61).trim();
    const arrivalUtcOffset = line.substring(61, 66).trim();
    
    // Тип ВС и другие данные
    const aircraftType = line.substring(71, 75).trim();
    
    return {
      airlineDesignator,
      flightNumber,
      serviceType: line.substring(9, 10).trim(),
      periodFrom: startDate ? startDate.toISOString().split('T')[0] : globalPeriod.startDate,
      periodTo: endDate ? endDate.toISOString().split('T')[0] : globalPeriod.endDate,
      rawPeriodFrom: startDateStr,
      rawPeriodTo: endDateStr,
      daysOfOperation,
      departureAirport,
      departureTime,
      departureUtcOffset,
      arrivalAirport,
      arrivalTime,
      arrivalUtcOffset,
      aircraftType,
      periodValid
    };
  } catch (error) {
    console.error('Ошибка при парсинге строки рейса:', error);
    return null;
  }
};

/**
 * Преобразует данные из формата парсера в формат приложения
 * @param {Object} parsedData - Данные, полученные от парсера
 * @returns {Array} Массив рейсов в формате приложения
 */
const transformData = (parsedData) => {
  const flights = [];
  
  // Обработка рейсов
  if (parsedData && parsedData.flightLegs) {
    console.log(`Преобразование ${parsedData.flightLegs.length} рейсов в формат приложения`);
    
    parsedData.flightLegs.forEach(leg => {
      try {
        // Дополнительная проверка периода
        const periodStartDate = leg.periodFrom;
        const periodEndDate = leg.periodTo;
        
        // Проверяем валидность дат
        if (!isValidISODateString(periodStartDate) || !isValidISODateString(periodEndDate)) {
          console.warn(`Пропуск рейса ${leg.airlineDesignator}${leg.flightNumber} из-за невалидных дат:`, 
                       periodStartDate, periodEndDate);
          return;
        }
        
        // Формируем объект рейса в формате, который ожидает наше приложение
        const flight = {
          airlineCode: leg.airlineDesignator,
          flightNumber: leg.flightNumber,
          fullFlightNumber: `${leg.airlineDesignator}${leg.flightNumber}`,
          departure: {
            airport: leg.departureAirport,
            time: formatTime(leg.departureTime) + " UTC"
          },
          arrival: {
            airport: leg.arrivalAirport,
            time: formatTime(leg.arrivalTime) + " UTC"
          },
          period: {
            startDate: periodStartDate,
            endDate: periodEndDate,
            rawStartDate: leg.rawPeriodFrom,
            rawEndDate: leg.rawPeriodTo,
            isFixed: !leg.periodValid
          },
          daysOfOperation: parseDaysOfOperation(leg.daysOfOperation),
          aircraftType: leg.aircraftType,
          aircraftId: generateAircraftId(leg.airlineDesignator, leg.aircraftType, leg.flightNumber)
        };
        
        flights.push(flight);
      } catch (err) {
        console.error('Ошибка при преобразовании рейса:', err);
      }
    });
  }
  
  return flights;
};

/**
 * Форматирование времени в формат HH:MM
 * @param {string} timeStr - Строка времени в формате HHMM
 * @returns {string} Отформатированное время
 */
const formatTime = (timeStr) => {
  if (!timeStr) return '00:00';
  
  if (timeStr.length === 4) {
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
  }
  
  return timeStr;
};

/**
 * Парсит дату в формате SSIM (DDMMMYY)
 * @param {string} dateStr - Строка даты
 * @returns {Date|null} Объект Date или null при ошибке
 */
const parseSSIMDate = (dateStr) => {
  try {
    if (!dateStr || dateStr.length !== 7) {
      return null;
    }
    
    // SSIM формат: DDMMMYY (например, 01JAN25)
    const match = dateStr.match(/^(\d{2})([A-Z]{3})(\d{2})$/);
    
    if (!match) {
      return null;
    }
    
    const [, day, monthCode, year] = match;
    const monthIndex = getMonthIndex(monthCode);
    
    if (monthIndex === -1) {
      return null;
    }
    
    // Преобразуем год в полный формат (20xx)
    const fullYear = 2000 + parseInt(year, 10);
    
    // Проверяем корректность дня
    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return null;
    }
    
    // Создаем дату
    const date = new Date(fullYear, monthIndex, dayNum);
    
    // Проверяем валидность даты (например, 31FEB будет скорректировано в JS)
    if (date.getDate() !== dayNum) {
      return null; // Невалидная дата (например, 31 февраля)
    }
    
    return date;
  } catch (error) {
    console.error('Ошибка при парсинге даты:', error, dateStr);
    return null;
  }
};

/**
 * Получает индекс месяца по трехбуквенному коду
 * @param {string} monthCode - Трехбуквенный код месяца (JAN, FEB, etc.)
 * @returns {number} Индекс месяца (0-11) или -1 при ошибке
 */
const getMonthIndex = (monthCode) => {
  const months = {
    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
  };
  
  return months[monthCode] !== undefined ? months[monthCode] : -1;
};

/**
 * Форматирование даты из формата SSIM (DDMMMYY) в стандартный формат
 * @param {string} dateStr - Дата в формате DDMMMYY
 * @returns {string} Отформатированная дата в формате YYYY-MM-DD
 */
const formatDate = (dateStr) => {
  try {
    const date = parseSSIMDate(dateStr);
    
    if (date) {
      return date.toISOString().split('T')[0];
    }
    
    console.warn('Не удалось отформатировать дату:', dateStr);
    return '';
  } catch (error) {
    console.error("Ошибка при форматировании даты:", error, dateStr);
    return '';
  }
};

/**
 * Проверяет, является ли строка валидной датой в формате ISO
 * @param {string} dateStr - Дата в формате YYYY-MM-DD
 * @returns {boolean} true, если дата валидна
 */
const isValidISODateString = (dateStr) => {
  if (!dateStr) return false;
  
  // Проверяем формат YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  
  // Проверяем валидность даты
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return false;
  }
  
  // Убеждаемся, что после парсинга дата не изменилась
  const parts = dateStr.split('-');
  return (
    date.getFullYear() === parseInt(parts[0], 10) &&
    date.getMonth() + 1 === parseInt(parts[1], 10) &&
    date.getDate() === parseInt(parts[2], 10)
  );
};

/**
 * Преобразование строки дней операций в читаемый формат
 * @param {string} daysStr - Строка с днями недели (например, "1234567" для ежедневных рейсов)
 * @returns {string[]} Массив дней недели на русском языке
 */
const parseDaysOfOperation = (daysStr) => {
  const daysMapping = {
    '1': 'Понедельник',
    '2': 'Вторник',
    '3': 'Среда',
    '4': 'Четверг',
    '5': 'Пятница',
    '6': 'Суббота',
    '7': 'Воскресенье'
  };
  
  const result = [];
  
  for (let i = 0; i < daysStr.length; i++) {
    const char = daysStr[i];
    if (daysMapping[char]) {
      result.push(daysMapping[char]);
    }
  }
  
  // Если дни не указаны, предполагаем все дни недели
  if (result.length === 0) {
    return Object.values(daysMapping);
  }
  
  return result;
};

/**
 * Генерирует идентификатор воздушного судна
 * @param {string} airlineCode - Код авиакомпании
 * @param {string} aircraftType - Тип воздушного судна
 * @param {string} flightNumber - Номер рейса
 * @returns {string} Идентификатор воздушного судна
 */
const generateAircraftId = (airlineCode, aircraftType, flightNumber) => {
  // Формируем борт-номер в формате "Тип - Авиакомпания/Регномер"
  const regNumber = Math.floor(Math.random() * 900) + 100;
  return `${aircraftType || 'Unknown'} - ${airlineCode}${regNumber}`;
};

/**
 * Генерирует расписание рейсов на основе данных SSIM
 * @param {Array} flights - Массив рейсов из SSIM
 * @param {string} startDate - Начальная дата для генерации расписания
 * @param {string} endDate - Конечная дата для генерации расписания
 * @returns {Array} Массив конкретных рейсов с датами
 */
export const generateSchedule = (flights, startDate, endDate) => {
  try {
    console.log(`Генерация расписания с ${startDate} по ${endDate} для ${flights.length} рейсов`);
    
    // Валидация входных параметров
    if (!Array.isArray(flights) || flights.length === 0) {
      console.error('Список рейсов пуст или не является массивом');
      return [];
    }
    
    if (!startDate || !endDate) {
      console.error('Не указаны даты начала или конца периода');
      return [];
    }
    
    // Проверяем формат дат
    if (!isValidISODateString(startDate) || !isValidISODateString(endDate)) {
      console.error('Некорректный формат дат:', startDate, endDate);
      return [];
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Проверяем последовательность дат
    if (start > end) {
      console.error('Некорректный период: начало после конца');
      return [];
    }
    
    const schedule = [];
    
    for (const flight of flights) {
      try {
        // Проверяем наличие периода
        if (!flight.period || !flight.period.startDate || !flight.period.endDate) {
          console.warn(`Пропуск рейса ${flight.fullFlightNumber} - отсутствует или некорректный период`);
          continue;
        }
        
        // Проверяем формат дат периода
        if (!isValidISODateString(flight.period.startDate) || !isValidISODateString(flight.period.endDate)) {
          console.warn(`Пропуск рейса ${flight.fullFlightNumber} - некорректный формат дат периода:`, 
                       flight.period.startDate, flight.period.endDate);
          continue;
        }
        
        // Создаем объекты дат из строк
        const flightStartDate = new Date(flight.period.startDate);
        const flightEndDate = new Date(flight.period.endDate);
        
        // Проверяем последовательность дат периода
        if (flightStartDate > flightEndDate) {
          console.warn(`Исправление рейса ${flight.fullFlightNumber} - период начинается после конца`);
          // Меняем даты местами
          [flightStartDate, flightEndDate] = [flightEndDate, flightStartDate];
        }
        
        // Определяем период пересечения
        const effectiveStartDate = new Date(Math.max(start.getTime(), flightStartDate.getTime()));
        const effectiveEndDate = new Date(Math.min(end.getTime(), flightEndDate.getTime()));
        
        // Проверяем, есть ли пересечение периодов
        if (effectiveStartDate > effectiveEndDate) {
          console.log(`Пропуск рейса ${flight.fullFlightNumber} - вне периода отображения`);
          continue;
        }
        
        console.log(`Рейс ${flight.fullFlightNumber}: Эффективный период: ${
          effectiveStartDate.toISOString().split('T')[0]} - ${
          effectiveEndDate.toISOString().split('T')[0]}`);
        
        // Проверяем наличие дней выполнения рейса
        if (!flight.daysOfOperation || flight.daysOfOperation.length === 0) {
          console.warn(`Рейс ${flight.fullFlightNumber} не имеет указанных дней выполнения, предполагаем все дни`);
        }
        
        // Генерируем рейсы для каждого дня в периоде
        let currentDate = new Date(effectiveStartDate);
        currentDate.setHours(0, 0, 0, 0); // Начало дня
        
        while (currentDate <= effectiveEndDate) {
          // Проверяем день недели
          const dayOfWeek = currentDate.getDay(); // 0 - воскресенье, 1-6 - пн-сб
          const dayIndex = dayOfWeek === 0 ? 7 : dayOfWeek; // Преобразуем в 1-7 (пн-вс)
          
          // Проверяем, выполняется ли рейс в этот день недели
          const daysOfWeek = flight.daysOfOperation.map(dayName => getDayIndex(dayName));
          
          // Рейс выполняется в этот день, если день указан в списке или список пуст (все дни)
          const flightOperatesOnThisDay = 
            daysOfWeek.length === 0 || daysOfWeek.includes(dayIndex);
          
          if (flightOperatesOnThisDay) {
            // Комбинируем дату с временем вылета и прилета
            const departureDatetime = combineDateAndTime(currentDate, flight.departure.time);
            const arrivalDatetime = combineDateAndTime(currentDate, flight.arrival.time);
            
            // Если время прилета меньше времени вылета, считаем, что рейс прибывает на следующий день
            if (arrivalDatetime < departureDatetime) {
              arrivalDatetime.setDate(arrivalDatetime.getDate() + 1);
            }
            
            // Создаем копию рейса с конкретными датами и временами
            const scheduledFlight = {
              ...flight,
              departureDatetime: departureDatetime.toISOString(),
              arrivalDatetime: arrivalDatetime.toISOString(),
              duration: calculateDuration(departureDatetime, arrivalDatetime)
            };
            
            schedule.push(scheduledFlight);
          }
          
          // Переходим к следующему дню
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } catch (error) {
        console.error(`Ошибка при обработке рейса ${flight.fullFlightNumber}:`, error);
      }
    }
    
    console.log(`Всего сгенерировано рейсов: ${schedule.length}`);
    
    // Сортируем по времени вылета
    return schedule.sort((a, b) => new Date(a.departureDatetime) - new Date(b.departureDatetime));
  } catch (error) {
    console.error('Ошибка при генерации расписания:', error);
    return [];
  }
};

/**
 * Возвращает индекс дня недели по его названию
 * @param {string} dayName - Название дня недели (Понедельник, Вторник, ...)
 * @returns {number} Индекс дня недели (1-7, где 1 - понедельник)
 */
const getDayIndex = (dayName) => {
  const days = [
    'Понедельник', 'Вторник', 'Среда', 'Четверг', 
    'Пятница', 'Суббота', 'Воскресенье'
  ];
  
  const index = days.indexOf(dayName);
  return index !== -1 ? index + 1 : 0;
};

/**
 * Комбинирует дату и время в единый объект Date
 * @param {Date} date - Объект даты
 * @param {string} timeStr - Строка времени в формате HH:MM UTC
 * @returns {Date} Объект Date с указанными датой и временем
 */
const combineDateAndTime = (date, timeStr) => {
  try {
    const newDate = new Date(date);
    
    if (!timeStr) {
      console.warn('Пустая строка времени, используем 00:00');
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    }
    
    // Удаляем "UTC" и разделяем на часы и минуты
    const timeParts = timeStr.replace(' UTC', '').split(':');
    
    if (timeParts.length === 2) {
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (!isNaN(hours) && !isNaN(minutes)) {
        newDate.setHours(hours, minutes, 0, 0);
      } else {
        console.warn(`Некорректное время: ${timeStr}, используем 00:00`);
        newDate.setHours(0, 0, 0, 0);
      }
    } else {
      console.warn(`Некорректный формат времени: ${timeStr}, используем 00:00`);
      newDate.setHours(0, 0, 0, 0);
    }
    
    return newDate;
  } catch (error) {
    console.error('Ошибка при комбинировании даты и времени:', error);
    return new Date(date); // Возвращаем исходную дату без изменения времени
  }
};

/**
 * Рассчитывает продолжительность рейса
 * @param {Date} departure - Дата и время вылета
 * @param {Date} arrival - Дата и время прилета
 * @returns {string} Строка продолжительности в формате ЧЧ:ММ
 */
const calculateDuration = (departure, arrival) => {
  try {
    // Проверка входных параметров
    if (!departure || !arrival) {
      return '00:00';
    }
    
    const depTime = new Date(departure).getTime();
    const arrTime = new Date(arrival).getTime();
    
    if (isNaN(depTime) || isNaN(arrTime)) {
      console.warn('Невалидное время вылета или прилета');
      return '00:00';
    }
    
    // Рассчитываем разницу
    const diffMs = arrTime - depTime;
    
    // Проверка на отрицательную разницу
    if (diffMs < 0) {
      console.warn('Время прилета раньше времени вылета');
      return '00:00';
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Ошибка при расчете продолжительности полета:', error);
    return '00:00';
  }
};
