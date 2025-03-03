/**
 * Парсер SSIM-файлов, интегрированный напрямую в проект
 * На основе библиотеки https://github.com/sthonnard/ssimparser
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
          const flightLeg = parseFlightLegRecord(line);
          if (flightLeg) {
            result.flightLegs.push(flightLeg);
          }
          break;
        // Можно добавить обработку других типов записей при необходимости
      }
    });
    
    return result;
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
    return {
      airlineDesignator: line.substring(1, 3).trim(),
      periodFrom: line.substring(11, 18).trim(),
      periodTo: line.substring(18, 25).trim()
    };
  };
  
  /**
   * Парсит запись рейса (тип 3)
   * @param {string} line - Строка с информацией о рейсе
   * @returns {Object} Данные рейса
   */
  const parseFlightLegRecord = (line) => {
    try {
      // Пример формата строки: 3 SU  0060101S13FEB2521FEB251 345   SVO04200420+0300B LED06000600+03001 320
      
      const airlineDesignator = line.substring(2, 5).trim();
      const flightNumber = line.substring(5, 9).trim();
      const serviceType = line.substring(9, 10).trim();
      
      // Даты и дни выполнения
      let periodFrom = line.substring(13, 20).trim();
      let periodTo = line.substring(20, 27).trim();
      
      // Обработка специальных форматов дат
      if (periodFrom.match(/^[A-Z]/i)) {
        periodFrom = periodFrom.substring(1);
      }
      if (periodTo.match(/^\d{1,2}/)) {
        periodTo = periodTo.substring(periodTo.match(/^\d{1,2}/)[0].length);
      }
      
      const daysOfOperation = line.substring(27, 34).trim();
      
      // Данные вылета и прилета
      const departureAirport = line.substring(36, 39).trim();
      const departureTime = line.substring(39, 43).trim();
      const departureUtcOffset = line.substring(43, 48).trim();
      const departureTerminal = line.substring(48, 49).trim();
      
      const arrivalAirport = line.substring(54, 57).trim();
      const arrivalTime = line.substring(57, 61).trim();
      const arrivalUtcOffset = line.substring(61, 66).trim();
      const arrivalTerminal = line.substring(66, 67).trim();
      
      // Тип ВС и другие данные
      const aircraftType = line.substring(71, 75).trim();
      
      return {
        airlineDesignator,
        flightNumber,
        serviceType,
        periodFrom: formatDate(periodFrom),
        periodTo: formatDate(periodTo),
        daysOfOperation,
        departureAirport,
        departureTime,
        departureUtcOffset,
        departureTerminal,
        arrivalAirport,
        arrivalTime,
        arrivalUtcOffset,
        arrivalTerminal,
        aircraftType
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
              startDate: leg.periodFrom,
              endDate: leg.periodTo
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
   * Форматирование даты из формата SSIM (DDMMMYY) в стандартный формат
   * @param {string} dateStr - Дата в формате DDMMMYY
   * @returns {string} Отформатированная дата в формате YYYY-MM-DD
   */
  const formatDate = (dateStr) => {
    try {
      // Проверка на DDMMMYY (например, 13FEB25)
      const dayMatch = dateStr.match(/\d{2}/);
      const monthMatch = dateStr.match(/[A-Z]{3}/i);
      const yearMatch = dateStr.match(/\d{2}$/);
      
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
      
      // Если не удалось распознать формат, возвращаем исходную строку
      return dateStr;
    } catch (error) {
      console.error("Ошибка при форматировании даты:", error);
      return dateStr;
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
    return `${aircraftType} - ${airlineCode}${regNumber}`;
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