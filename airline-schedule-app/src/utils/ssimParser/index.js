/**
 * Улучшенный парсер SSIM-файлов с корректной обработкой дат и времени
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
    
    // Парсинг файла
    const parsedData = parseSSIMContent(flightLines);
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
    flightLegs: []
  };
  
  for (const line of lines) {
    try {
      // Проверка на тип 3 (Flight)
      if (line.charAt(0) !== '3') continue;
      
      const flightLeg = parseFlightLegRecord(line);
      if (flightLeg) {
        result.flightLegs.push(flightLeg);
      }
    } catch (error) {
      console.error('Ошибка при парсинге строки:', error);
    }
  }
  
  return result;
};

/**
 * Парсит запись рейса (тип 3)
 * @param {string} line - Строка с информацией о рейсе
 * @returns {Object} Данные рейса
 */
const parseFlightLegRecord = (line) => {
  try {
    // Проверка минимальной длины строки
    if (line.length < 75) {
      return null;
    }
    
    // Пример строки: 3 SU 14300801J10JAN2511JAN25    5   SVO21252125+0300B BAX01450145+0300  320
    
    // Парсинг авиакомпании и номера рейса
    const airlineDesignator = line.substring(2, 5).trim();
    const flightNumber = line.substring(5, 9).trim();
    
    // Парсинг дат периода
    // В строке даты могут быть в формате DDMMMYY (например, 10JAN25)
    // Индексы 14-21 для начальной даты и 21-28 для конечной даты
    const startDateStr = line.substring(14, 21).trim();
    const endDateStr = line.substring(21, 28).trim();
    
    // Парсинг дней операций (1-7, где 1=понедельник, 7=воскресенье)
    const daysOfOperation = line.substring(28, 35).trim();
    
    // Аэропорты и времена
    const departureAirport = line.substring(36, 39).trim();
    const departureTime = line.substring(39, 43).trim(); // HHMM
    const departureUtcOffset = line.substring(43, 48).trim();
    
    const arrivalAirport = line.substring(54, 57).trim();
    const arrivalTime = line.substring(57, 61).trim(); // HHMM
    const arrivalUtcOffset = line.substring(61, 66).trim();
    
    // Тип воздушного судна
    const aircraftType = line.substring(71, 75).trim();
    
    // Специальная обработка для рейса SU1430 и других ночных рейсов
    // Если время прилёта меньше времени вылета, это обычно означает, что рейс прибывает на следующий день
    const depTimeNum = parseInt(departureTime, 10);
    const arrTimeNum = parseInt(arrivalTime, 10);
    
    // Проверка, является ли рейс ночным (прибытие на следующий день)
    const isOvernightFlight = arrTimeNum < depTimeNum;
    
    console.log(`Рейс ${airlineDesignator}${flightNumber}: ${departureAirport} ${departureTime} -> ${arrivalAirport} ${arrivalTime}, ночной рейс: ${isOvernightFlight}`);
    
    // Преобразование дат
    const startDate = parseSSIMDate(startDateStr);
    const endDate = parseSSIMDate(endDateStr);
    
    // Формируем полный номер рейса, сохраняя формат
    const fullFlightNumber = `${airlineDesignator}${flightNumber}`;
    
    return {
      airlineDesignator,
      flightNumber,
      fullFlightNumber,
      startDate,
      endDate,
      daysOfOperation,
      departureAirport,
      departureTime,
      departureUtcOffset,
      arrivalAirport,
      arrivalTime,
      arrivalUtcOffset,
      aircraftType,
      isOvernightFlight // Добавляем флаг ночного рейса
    };
  } catch (error) {
    console.error('Ошибка при парсинге рейса:', error);
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
            endDate: leg.endDate
          },
          daysOfOperation: parseDaysOfOperation(leg.daysOfOperation),
          aircraftType: leg.aircraftType,
          aircraftId: generateAircraftId(leg.airlineDesignator, leg.aircraftType, leg.flightNumber),
          isOvernightFlight: leg.isOvernightFlight || false // Добавляем флаг ночного рейса
        };
        
        flights.push(flight);
      } catch (err) {
        console.error('Ошибка при трансформации рейса:', err);
      }
    });
  }
  
  return flights;
};

/**
 * Парсит дату в формате SSIM (DDMMMYY)
 * @param {string} dateStr - Строка даты
 * @returns {string} Дата в формате YYYY-MM-DD
 */
const parseSSIMDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString().split('T')[0];
  }
  
  // Очистка строки от лишних символов
  const cleanStr = dateStr.replace(/[^A-Za-z0-9]/g, '').trim();
  
  // Проверяем формат DDMMMYY (например, 10JAN25)
  const match = cleanStr.match(/^(\d{2})([A-Za-z]{3})(\d{2})$/);
  
  if (match) {
    const day = match[1];
    const monthStr = match[2].toUpperCase();
    const year = match[3];
    
    // Преобразование месяца из строкового представления в числовое
    const months = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const month = months[monthStr] || '01';
    const fullYear = `20${year}`;
    
    return `${fullYear}-${month}-${day}`;
  }
  
  // Если формат не распознан, возвращаем текущую дату
  return new Date().toISOString().split('T')[0];
};

/**
 * Форматирование времени из HHMM в HH:MM
 * @param {string} timeStr - Строка времени в формате HHMM
 * @returns {string} Отформатированное время HH:MM
 */
const formatTime = (timeStr) => {
  if (!timeStr || timeStr.length !== 4) {
    return '00:00';
  }
  
  // Разделяем часы и минуты
  const hours = timeStr.substring(0, 2);
  const minutes = timeStr.substring(2, 4);
  
  return `${hours}:${minutes}`;
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
  
  return result.length > 0 ? result : Object.values(daysMapping);
};

/**
 * Генерирует идентификатор воздушного судна
 * @param {string} airlineCode - Код авиакомпании
 * @param {string} aircraftType - Тип воздушного судна
 * @param {string} flightNumber - Номер рейса
 * @returns {string} Идентификатор воздушного судна
 */
const generateAircraftId = (airlineCode, aircraftType, flightNumber) => {
  // Формируем постоянный борт-номер на основе номера рейса
  const hash = Array.from(flightNumber).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const regNumber = 100 + (hash % 900);
  
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
    
    // Корректируем даты, чтобы в полночь начинался новый день
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const schedule = [];
    
    // Журналирование периода
    console.log(`Период расписания: ${start.toISOString()} - ${end.toISOString()}`);
    
    for (const flight of flights) {
      try {
        if (!flight.period || !flight.period.startDate || !flight.period.endDate) {
          console.warn(`Пропуск рейса без периода: ${flight.fullFlightNumber}`);
          continue;
        }
        
        // Проверка на ночной рейс
        const isOvernightFlight = flight.isOvernightFlight || false;
        
        if (isOvernightFlight) {
          console.log(`Рейс ${flight.fullFlightNumber} определен как ночной (с прибытием на следующий день)`);
        }
        
        const flightStartDate = new Date(flight.period.startDate);
        const flightEndDate = new Date(flight.period.endDate);
        
        if (isNaN(flightStartDate.getTime()) || isNaN(flightEndDate.getTime())) {
          console.warn(`Пропуск рейса с некорректными датами: ${flight.fullFlightNumber}`);
          continue;
        }
        
        // Корректируем даты периода рейса
        flightStartDate.setHours(0, 0, 0, 0);
        flightEndDate.setHours(23, 59, 59, 999);
        
        // Проверяем, пересекается ли период рейса с запрашиваемым периодом
        if (flightEndDate < start || flightStartDate > end) {
          continue;
        }
        
        // Определяем период пересечения
        const effectiveStartDate = new Date(Math.max(start.getTime(), flightStartDate.getTime()));
        const effectiveEndDate = new Date(Math.min(end.getTime(), flightEndDate.getTime()));
        
        // Проверка дней операций
        if (!flight.daysOfOperation || !Array.isArray(flight.daysOfOperation)) {
          console.warn(`Пропуск рейса без дней операций: ${flight.fullFlightNumber}`);
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
          const matchingDay = flight.daysOfOperation.find(day => getDayIndex(day) === dayIndex);
          
          if (matchingDay) {
            // Создаем дату и время вылета
            const departureDatetime = combineDateAndTime(currentDate, flight.departure.time);
            
            // Дата прилета: для ночных рейсов - следующий день, для обычных - тот же день
            const arrivalDate = new Date(currentDate);
            if (isOvernightFlight) {
              arrivalDate.setDate(arrivalDate.getDate() + 1);
            }
            
            const arrivalDatetime = combineDateAndTime(arrivalDate, flight.arrival.time);
            
            // Дополнительная проверка: если arrivalDatetime все равно меньше чем departureDatetime, 
            // значит это скорее всего ночной рейс, даже если это не было указано
            if (arrivalDatetime < departureDatetime) {
              arrivalDatetime.setDate(arrivalDatetime.getDate() + 1);
            }
            
            const scheduledFlight = {
              ...flight,
              departureDatetime: departureDatetime.toISOString(),
              arrivalDatetime: arrivalDatetime.toISOString(),
              duration: calculateDuration(departureDatetime, arrivalDatetime)
            };
            
            schedule.push(scheduledFlight);
            
            if (schedule.length <= 5) {
              console.log(`Добавлен рейс ${scheduledFlight.fullFlightNumber} с ${scheduledFlight.departure.airport} в ${scheduledFlight.arrival.airport} на ${departureDatetime.toISOString()}`);
            }
          }
          
          // Переходим к следующему дню
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } catch (error) {
        console.error(`Ошибка при обработке рейса ${flight.fullFlightNumber}:`, error);
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
  
  // Удаляем "UTC" и разбиваем строку времени
  const cleanTimeStr = timeStr.replace(' UTC', '');
  const timeParts = cleanTimeStr.split(':');
  
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
  const diffMs = arrival - departure;
  
  // Проверка на отрицательное значение (может возникнуть при ошибках в данных)
  if (diffMs < 0) {
    return '00:00';
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};
