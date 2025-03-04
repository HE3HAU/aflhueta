/**
 * Улучшенный парсер SSIM-файлов с тихой обработкой нестандартных форматов
 * и поддержкой отображения всех рейсов
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
    
    // Фильтруем только строки с записями о рейсах (тип 3)
    const flightLines = lines.filter(line => line.trim().charAt(0) === '3');
    console.log(`Найдено ${flightLines.length} строк с рейсами`);
    
    // Определение глобального периода из данных
    const globalPeriod = detectGlobalPeriod(flightLines);
    console.log(`Определен глобальный период: ${globalPeriod.startDate} - ${globalPeriod.endDate}`);
    
    // Парсинг файла
    const parsedData = parseSSIMContent(flightLines, globalPeriod);
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
 * Определяет глобальный период на основе всех строк SSIM
 * @param {Array<string>} lines - Строки SSIM-файла типа 3
 * @returns {Object} Глобальный период (startDate, endDate)
 */
const detectGlobalPeriod = (lines) => {
  const validDates = [];
  
  for (const line of lines) {
    try {
      // Проверяем минимальную длину строки
      if (line.length < 28) continue;
      
      const startDateStr = line.substring(14, 21).trim();
      const endDateStr = line.substring(21, 28).trim();
      
      // Тихий режим для парсинга дат (без логирования предупреждений)
      let startDate = parseSSIMDate(startDateStr, true);
      let endDate = parseSSIMDate(endDateStr, true);
      
      if (startDate && endDate) {
        // Проверка последовательности дат
        if (startDate > endDate) {
          // Обмен датами
          [startDate, endDate] = [endDate, startDate];
        }
        validDates.push({ startDate, endDate });
      }
    } catch (error) {
      // Игнорируем ошибки при определении периода
    }
  }
  
  console.log(`Найдено ${validDates.length} валидных периодов`);
  
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
  
  const startDateStr = minStartDate.toISOString().split('T')[0];
  const endDateStr = maxEndDate.toISOString().split('T')[0];
  
  console.log(`Определен глобальный период: ${startDateStr} - ${endDateStr}`);
  
  return {
    startDate: startDateStr,
    endDate: endDateStr
  };
};

/**
 * Парсит содержимое SSIM-файла
 * @param {Array} lines - Массив строк файла
 * @param {Object} globalPeriod - Глобальный период для исправления ошибок
 * @returns {Object} Структурированные данные
 */
const parseSSIMContent = (lines, globalPeriod) => {
  const result = {
    header: null,
    carrier: null,
    flightLegs: []
  };
  
  // Счетчик для отслеживания нестандартных форматов дат
  let nonStandardDatesCount = 0;
  
  for (const line of lines) {
    try {
      // Проверка на тип 3 (Flight)
      if (line.charAt(0) !== '3') continue;
      
      const flightLeg = parseFlightLegRecord(line, globalPeriod);
      if (flightLeg) {
        if (flightLeg.periodFixed) {
          nonStandardDatesCount++;
        }
        result.flightLegs.push(flightLeg);
      }
    } catch (error) {
      // Тихий режим для ошибок парсинга
    }
  }
  
  // Вместо вывода множества предупреждений, выводим обобщенное сообщение
  if (nonStandardDatesCount > 0) {
    console.log(`Обнаружено ${nonStandardDatesCount} рейсов с нестандартными датами, применена автокоррекция`);
  }
  
  return result;
};

/**
 * Парсит запись рейса (тип 3)
 * @param {string} line - Строка с информацией о рейсе
 * @param {Object} globalPeriod - Глобальный период для исправления ошибок
 * @returns {Object} Данные рейса
 */
const parseFlightLegRecord = (line, globalPeriod) => {
  try {
    // Проверка минимальной длины строки
    if (line.length < 75) {
      return null;
    }
    
    const airlineDesignator = line.substring(2, 5).trim();
    const flightNumber = line.substring(5, 9).trim();
    const fullFlightNumber = `${airlineDesignator}${flightNumber}`;
    
    // Даты и дни выполнения
    const startDateStr = line.substring(14, 21).trim();
    const endDateStr = line.substring(21, 28).trim();
    const daysOfOperation = line.substring(28, 35).trim();
    
    // Тихий режим для парсинга дат
    let startDate = parseSSIMDate(startDateStr, true);
    let endDate = parseSSIMDate(endDateStr, true);
    
    // Проверка и исправление дат
    let periodValid = true;
    let periodFixed = false;
    
    if (!startDate || !endDate) {
      periodValid = false;
      periodFixed = true;
      
      // Используем глобальный период вместо некорректных дат
      startDate = new Date(globalPeriod.startDate);
      endDate = new Date(globalPeriod.endDate);
    } 
    
    // Проверка последовательности дат
    if (startDate > endDate) {
      periodFixed = true;
      [startDate, endDate] = [endDate, startDate];
    }
    
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
      fullFlightNumber,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      rawStartDate: startDateStr,
      rawEndDate: endDateStr,
      daysOfOperation,
      departureAirport,
      departureTime,
      departureUtcOffset,
      arrivalAirport,
      arrivalTime,
      arrivalUtcOffset,
      aircraftType,
      periodValid,
      periodFixed
    };
  } catch (error) {
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
        // Формируем объект рейса в формате, который ожидает наше приложение
        const flight = {
          airlineCode: leg.airlineDesignator,
          flightNumber: leg.flightNumber,
          fullFlightNumber: leg.fullFlightNumber,
          departure: {
            airport: leg.departureAirport,
            time: formatTime(leg.departureTime) + " UTC"
          },
          arrival: {
            airport: leg.arrivalAirport,
            time: formatTime(leg.arrivalTime) + " UTC"
          },
          period: {
            startDate: leg.startDate,
            endDate: leg.endDate,
            rawStartDate: leg.rawStartDate,
            rawEndDate: leg.rawEndDate,
            isFixed: leg.periodFixed
          },
          daysOfOperation: parseDaysOfOperation(leg.daysOfOperation),
          aircraftType: leg.aircraftType,
          aircraftId: generateAircraftId(leg.airlineDesignator, leg.aircraftType, leg.flightNumber)
        };
        
        flights.push(flight);
      } catch (err) {
        // Тихая обработка ошибок трансформации
      }
    });
  }
  
  return flights;
};

/**
 * Парсит дату в формате SSIM (DDMMMYY) и его нестандартных вариациях
 * @param {string} dateStr - Строка даты
 * @param {boolean} silent - Подавлять вывод ошибок и предупреждений
 * @returns {Date|null} Объект Date или null при ошибке
 */
const parseSSIMDate = (dateStr, silent = false) => {
  try {
    if (!dateStr || typeof dateStr !== 'string') {
      return null;
    }
    
    // Очистка от лишних пробелов
    const cleanDateStr = dateStr.trim();
    
    // Обработка нестандартных форматов
    if (cleanDateStr.includes('A') || 
        cleanDateStr.includes('N') || 
        cleanDateStr.match(/[A-Z]{2,}/) ||
        cleanDateStr.length < 7) {
      
      // Создаем фиксированную дату (текущий день), но без логирования в тихом режиме
      const today = new Date();
      return today;
    }
    
    // Стандартный формат DDMMMYY (например, 01JAN25)
    const standardMatch = cleanDateStr.match(/^(\d{2})([A-Za-z]{3})(\d{2})$/);
    
    if (standardMatch) {
      const [, day, monthCode, year] = standardMatch;
      const monthIndex = getMonthIndex(monthCode.toUpperCase());
      
      if (monthIndex === -1) {
        return null;
      }
      
      // Преобразуем год в полный формат (20xx)
      const fullYear = 2000 + parseInt(year, 10);
      
      // Создаем дату
      const date = new Date(fullYear, monthIndex, parseInt(day, 10));
      
      return date;
    }
    
    // Другие форматы
    
    // YYYY-MM-DD
    const isoMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    
    // Если ничего не подошло, используем текущую дату
    return new Date();
    
  } catch (error) {
    return null;
  }
};

/**
 * Возвращает индекс месяца по трехбуквенному коду
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
  
  if (!daysStr) {
    // Если дни не указаны, возвращаем все дни
    return Object.values(daysMapping);
  }
  
  for (let i = 0; i < daysStr.length; i++) {
    const char = daysStr[i];
    if (daysMapping[char]) {
      result.push(daysMapping[char]);
    }
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
    
    if (!flights || !Array.isArray(flights) || flights.length === 0) {
      console.error('Некорректный массив рейсов');
      return [];
    }
    
    // Проверяем даты
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('Некорректные даты начала или конца периода');
      return [];
    }
    
    const schedule = [];
    
    for (const flight of flights) {
      try {
        if (!flight.period || !flight.period.startDate || !flight.period.endDate) {
          continue;
        }
        
        const flightStartDate = new Date(flight.period.startDate);
        const flightEndDate = new Date(flight.period.endDate);
        
        if (isNaN(flightStartDate.getTime()) || isNaN(flightEndDate.getTime())) {
          continue;
        }
        
        // Определяем период пересечения
        const effectiveStartDate = new Date(Math.max(start.getTime(), flightStartDate.getTime()));
        const effectiveEndDate = new Date(Math.min(end.getTime(), flightEndDate.getTime()));
        
        if (effectiveStartDate > effectiveEndDate) {
          continue;
        }
        
        // Проверка дней операций
        if (!flight.daysOfOperation || !Array.isArray(flight.daysOfOperation)) {
          continue;
        }
        
        // Генерируем рейсы для каждого дня в периоде
        let currentDate = new Date(effectiveStartDate);
        currentDate.setHours(0, 0, 0, 0);
        
        while (currentDate <= effectiveEndDate) {
          const dayOfWeek = currentDate.getDay();
          // Преобразуем из 0-6 (вс-сб) в 1-7 (пн-вс)
          const dayIndex = dayOfWeek === 0 ? 7 : dayOfWeek;
          
          // Проверяем, выполняется ли рейс в этот день недели
          if (flight.daysOfOperation.some(day => getDayIndex(day) === dayIndex)) {
            const departureDatetime = combineDateAndTime(currentDate, flight.departure.time);
            const arrivalDatetime = combineDateAndTime(currentDate, flight.arrival.time);
            
            // Если время прилета меньше времени вылета, считаем, что рейс прибывает на следующий день
            if (arrivalDatetime < departureDatetime) {
              arrivalDatetime.setDate(arrivalDatetime.getDate() + 1);
            }
            
            schedule.push({
              ...flight,
              departureDatetime: departureDatetime.toISOString(),
              arrivalDatetime: arrivalDatetime.toISOString(),
              duration: calculateDuration(departureDatetime, arrivalDatetime)
            });
          }
          
          // Переходим к следующему дню
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } catch (error) {
        // Тихая обработка ошибок
      }
    }
    
    console.log(`Сгенерировано ${schedule.length} рейсов в расписании`);
    
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
  
  return days.indexOf(dayName) + 1;
};

/**
 * Комбинирует дату и время в единый объект Date
 * @param {Date} date - Объект даты
 * @param {string} timeStr - Строка времени в формате HH:MM UTC
 * @returns {Date} Объект Date с указанными датой и временем
 */
const combineDateAndTime = (date, timeStr) => {
  const newDate = new Date(date);
  
  if (!timeStr) {
    return newDate;
  }
  
  const timeParts = timeStr.replace(' UTC', '').split(':');
  
  if (timeParts.length === 2) {
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    if (!isNaN(hours) && !isNaN(minutes)) {
      newDate.setHours(hours, minutes, 0, 0);
    }
  }
  
  return newDate;
};

/**
 * Рассчитывает продолжительность рейса
 * @param {Date} departure - Дата и время вылета
 * @param {Date} arrival - Дата и время прилета
 * @returns {string} Строка продолжительности в формате ЧЧ:ММ
 */
const calculateDuration = (departure, arrival) => {
  const diff = arrival - departure; // Разница в миллисекундах
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};
