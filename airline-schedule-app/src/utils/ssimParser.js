/**
 * Утилита для парсинга SSIM-файлов с использованием библиотеки ssim-parser
 */
import { parseFile, parseString } from 'ssim-parser';

/**
 * Парсит SSIM-файл и возвращает структурированные данные о рейсах
 * @param {string} content - Содержимое SSIM-файла
 * @returns {Object} Объект с данными о рейсах
 */
export const parseSSIMFile = (content) => {
  try {
    console.log(`Начало парсинга SSIM-файла с использованием библиотеки ssim-parser`);
    
    // Парсинг с помощью библиотеки ssim-parser
    const parsedData = parseString(content);
    
    console.log(`Парсинг завершен, обработка результатов`);
    console.log('Структура данных:', Object.keys(parsedData));
    
    // Преобразование результатов в формат, понятный нашему приложению
    const flights = transformData(parsedData);
    
    return {
      success: true,
      flights,
      stats: {
        totalFlights: flights.length,
        parsed: content.split('\n').length
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
 * Преобразует данные из формата библиотеки в формат приложения
 * @param {Object} parsedData - Данные, полученные от библиотеки ssim-parser
 * @returns {Array} Массив рейсов в формате приложения
 */
const transformData = (parsedData) => {
  const flights = [];
  
  // Обработка рейсов, учитывая структуру данных из библиотеки
  if (parsedData && parsedData.flights) {
    console.log(`Найдено ${parsedData.flights.length} рейсов в SSIM-файле`);
    
    parsedData.flights.forEach(flight => {
      try {
        // Извлекаем данные о периоде полетов
        const periodFrom = flight.scheduleTimeFrame ? flight.scheduleTimeFrame.startDate : null;
        const periodTo = flight.scheduleTimeFrame ? flight.scheduleTimeFrame.endDate : null;
        
        // Извлекаем данные о дне недели
        const daysOfOperation = flight.serviceDays ? flight.serviceDays.operationalDays : '';
        
        // Формируем объект рейса в формате, который ожидает наше приложение
        const transformedFlight = {
          airlineCode: flight.airline || '',
          flightNumber: flight.flightNumber || '',
          fullFlightNumber: `${flight.airline}${flight.flightNumber}`,
          departure: {
            airport: flight.departure ? flight.departure.airport : '',
            time: formatTime(flight.departure ? flight.departure.time : '') + " UTC"
          },
          arrival: {
            airport: flight.arrival ? flight.arrival.airport : '',
            time: formatTime(flight.arrival ? flight.arrival.time : '') + " UTC"
          },
          period: {
            startDate: formatDate(periodFrom),
            endDate: formatDate(periodTo)
          },
          daysOfOperation: parseDaysOfOperation(daysOfOperation || ''),
          aircraftType: flight.equipment || '',
          aircraftId: generateAircraftId(flight.airline, flight.equipment, flight.flightNumber)
        };
        
        flights.push(transformedFlight);
      } catch (err) {
        console.error('Ошибка при обработке рейса:', err);
      }
    });
  }
  
  return flights;
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
  return `${aircraftType} - ${airlineCode}${regNumber}`;
};

/**
 * Форматирование времени в формат HH:MM
 * @param {string} timeStr - Строка времени в формате HHMM
 * @returns {string} Отформатированное время
 */
const formatTime = (timeStr) => {
  if (!timeStr) return '00:00';
  
  if (typeof timeStr === 'string' && timeStr.length === 4) {
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
  }
  
  return timeStr;
};

/**
 * Форматирование даты из формата SSIM (DDMMMYY) в стандартный формат
 * @param {string|Date} dateObj - Дата в формате DDMMMYY или объект Date
 * @returns {string} Отформатированная дата в формате YYYY-MM-DD
 */
const formatDate = (dateObj) => {
  try {
    if (!dateObj) return '';
    
    // Если это объект Date
    if (dateObj instanceof Date) {
      return dateObj.toISOString().split('T')[0];
    }
    
    // Если это строка в формате DDMMMYY
    if (typeof dateObj === 'string') {
      // Проверка на DDMMMYY (например, 13FEB25)
      const dayMatch = dateObj.match(/\d{2}/);
      const monthMatch = dateObj.match(/[A-Z]{3}/i);
      const yearMatch = dateObj.match(/\d{2}$/);
      
      if (dayMatch && monthMatch && yearMatch) {
        const day = dayMatch[0];
        const monthCode = monthMatch[0].toUpperCase();
        const year = yearMatch[0];
        
        // Преобразование трехбуквенного кода месяца в число
        const months = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        
        const month = months[monthCode] || '01';
        const fullYear = `20${year}`;
        
        return `${fullYear}-${month}-${day}`;
      }
    }
    
    // Если не удалось распознать формат, возвращаем исходную строку
    return String(dateObj);
  } catch (error) {
    console.error("Ошибка при форматировании даты:", error);
    return String(dateObj);
  }
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
  
  if (typeof daysStr === 'string') {
    for (let i = 0; i < daysStr.length; i++) {
      const char = daysStr[i];
      if (daysMapping[char]) {
        result.push(daysMapping[char]);
      }
    }
  } else if (Array.isArray(daysStr)) {
    // Если библиотека возвращает массив дней недели
    daysStr.forEach(day => {
      if (daysMapping[day]) {
        result.push(daysMapping[day]);
      }
    });
  }
  
  return result;
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    const schedule = [];
    
    for (const flight of flights) {
      const flightStartDate = new Date(flight.period.startDate);
      const flightEndDate = new Date(flight.period.endDate);
      
      // Определяем период пересечения
      const effectiveStartDate = new Date(Math.max(start, flightStartDate));
      const effectiveEndDate = new Date(Math.min(end, flightEndDate));
      
      console.log(`Рейс ${flight.fullFlightNumber}: Период ${flight.period.startDate} - ${flight.period.endDate}`);
      console.log(`Эффективный период: ${effectiveStartDate.toISOString().split('T')[0]} - ${effectiveEndDate.toISOString().split('T')[0]}`);
      
      if (effectiveStartDate > effectiveEndDate) {
        console.log(`Пропуск рейса ${flight.fullFlightNumber} - вне периода`);
        continue; // Периоды не пересекаются
      }
      
      // Генерируем рейсы для каждого дня в периоде
      let currentDate = new Date(effectiveStartDate);
      
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
          
          console.log(`Добавлен рейс ${flight.fullFlightNumber} на ${departureDatetime.toISOString()}`);
        }
        
        // Переходим к следующему дню
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
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
  const timeParts = timeStr.replace(' UTC', '').split(':');
  
  if (timeParts.length === 2) {
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    newDate.setHours(hours, minutes, 0, 0);
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