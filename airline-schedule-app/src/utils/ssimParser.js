/**
 * Расширенный SSIM-парсер для обработки файлов стандарта IATA SSIM
 * (Standard Schedules Information Manual)
 * 
 * Реализация основана на комбинации открытых источников и лучших практик
 * для эффективной и надежной обработки авиационных расписаний
 */
class SSIMParser {
  constructor(options = {}) {
    // Настройки парсера
    this.options = {
      // Требование точного соответствия формату (строгая валидация)
      strictMode: options.strictMode === undefined ? false : options.strictMode,
      // Автоматическое исправление ошибок, если это возможно
      autoFix: options.autoFix === undefined ? true : options.autoFix,
      // Расширенное логирование для отладки
      verboseLogging: options.verboseLogging === undefined ? false : options.verboseLogging,
      // Опция для обработки различных версий формата SSIM
      ssimVersion: options.ssimVersion || 'standard',
      // Переопределить справочники
      ...options
    };

    // Справочники для валидации
    this.aircraftTypes = options.aircraftTypes || 
                         new Set(['320', '321', '744', '32N', '738', '77W', '788', '333', '343']); 
    
    this.airlineDesignators = options.airlineDesignators || 
                             new Set(['SU', 'AA', 'BA', 'LH', 'DL', 'UA', 'AF', 'KL', 'S7', 'EK']); 
    
    this.airports = options.airports ||
                   new Set(['SVO', 'LED', 'AER', 'OVB', 'DME', 'JFK', 'LHR', 'CDG', 'FRA', 'DXB']);

    // Маппинг месяцев для конвертации SSIM-дат
    this.monthMap = {
      'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
      'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
    };

    // Маппинг дней недели
    this.daysOfWeekMap = {
      '1': 'Понедельник', '2': 'Вторник', '3': 'Среда', 
      '4': 'Четверг', '5': 'Пятница', '6': 'Суббота', '7': 'Воскресенье'
    };

    // Описание позиций в SSIM по стандарту IATA
    this.ssimFormat = {
      recordType: [0, 1],
      airlineDesignator: [2, 5],
      flightNumber: [5, 9],
      itineraryVariation: [9, 11],
      legSequence: [11, 13],
      serviceType: [13, 14],
      periodStart: [14, 21],
      periodEnd: [21, 28],
      daysOfOperation: [28, 35],
      departureStation: [36, 39],
      departureTime: [39, 43],
      departureUTC: [43, 48],
      arrivalStation: [54, 57],
      arrivalTime: [57, 61],
      arrivalUTC: [61, 66],
      aircraftType: [71, 75]
    };

    // Счетчики для статистики
    this.stats = {
      totalLines: 0,
      validFlights: 0,
      invalidFlights: 0,
      fixedFlights: 0,
      errors: {}
    };
  }

  /**
   * Основной метод парсинга SSIM-файла
   * @param {string} content - Содержимое SSIM-файла
   * @returns {Object} Результат парсинга
   */
  parseSSIMFile(content) {
    try {
      this.log('Начало парсинга SSIM-файла');
      this.resetStats();

      // Разделение на строки и фильтрация только строк типа 3 (Flight)
      const lines = content.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && trimmed.charAt(0) === '3';
      });

      this.stats.totalLines = lines.length;
      this.log(`Найдено ${lines.length} строк типа 3 (Flight)`);

      // Определение глобального периода (для исправления ошибок)
      const globalPeriod = this.detectGlobalPeriod(lines);
      this.log(`Определен глобальный период: ${globalPeriod.startDate} - ${globalPeriod.endDate}`);

      // Парсинг каждой строки в объект рейса
      const flights = [];
      const invalidFlights = [];

      for (const line of lines) {
        const result = this.parseFlightRecord(line, globalPeriod);
        
        if (result.isValid) {
          flights.push(result.flight);
          this.stats.validFlights++;
        } else {
          if (result.flight) {
            invalidFlights.push({
              flight: result.flight,
              errors: result.errors
            });
            
            // Если включено автоисправление и есть исправленная версия
            if (this.options.autoFix && result.fixedFlight) {
              flights.push(result.fixedFlight);
              this.stats.fixedFlights++;
            }
          }
          this.stats.invalidFlights++;
          
          // Собираем статистику по типам ошибок
          for (const error of result.errors) {
            this.stats.errors[error.code] = (this.stats.errors[error.code] || 0) + 1;
          }
        }
      }

      // Подготавливаем данные для визуализации
      const processedFlights = this.prepareFlightsForGanttChart(flights);

      this.log(`Парсинг завершен. Валидных: ${this.stats.validFlights}, исправленных: ${this.stats.fixedFlights}, невалидных: ${this.stats.invalidFlights}`);

      // Возвращаем результат с метаданными
      return {
        success: true,
        flights: processedFlights,
        invalidFlights: invalidFlights,
        stats: this.stats,
        globalPeriod
      };
    } catch (error) {
      this.logError('Критическая ошибка при парсинге SSIM-файла:', error);
      return {
        success: false,
        error: error.message,
        flights: [],
        stats: this.stats
      };
    }
  }

  /**
   * Определяет глобальный период на основе всех строк SSIM
   * @param {Array<string>} lines - Строки SSIM-файла
   * @returns {Object} Глобальный период (startDate, endDate)
   */
  detectGlobalPeriod(lines) {
    let minStartDate = null;
    let maxEndDate = null;
    let validDatesCount = 0;

    for (const line of lines) {
      try {
        if (line.length < this.ssimFormat.periodEnd[1]) continue;

        const startDateStr = line.substring(this.ssimFormat.periodStart[0], this.ssimFormat.periodStart[1]).trim();
        const endDateStr = line.substring(this.ssimFormat.periodEnd[0], this.ssimFormat.periodEnd[1]).trim();
        
        const startDate = this.parseSSIMDate(startDateStr);
        const endDate = this.parseSSIMDate(endDateStr);
        
        if (startDate && endDate && startDate <= endDate) {
          if (!minStartDate || startDate < minStartDate) {
            minStartDate = new Date(startDate);
          }
          
          if (!maxEndDate || endDate > maxEndDate) {
            maxEndDate = new Date(endDate);
          }
          
          validDatesCount++;
        }
      } catch (error) {
        // Игнорируем ошибки при определении периода
      }
    }

    // Если не нашли валидных периодов, создаем дефолтный
    if (!minStartDate || !maxEndDate) {
      const today = new Date();
      minStartDate = today;
      maxEndDate = new Date(today);
      maxEndDate.setDate(today.getDate() + 30); // период в 30 дней по умолчанию
      
      this.log('Не удалось определить глобальный период, используем дефолтный');
    } else {
      this.log(`Определен глобальный период на основе ${validDatesCount} валидных дат`);
    }

    return {
      startDate: this.formatDateToISOString(minStartDate),
      endDate: this.formatDateToISOString(maxEndDate)
    };
  }

  /**
   * Парсит запись рейса с расширенной валидацией
   * @param {string} line - Строка с информацией о рейсе
   * @param {Object} globalPeriod - Глобальный период для исправления ошибок
   * @returns {Object} Результат парсинга с валидацией
   */
  parseFlightRecord(line, globalPeriod) {
    const errors = [];
    let fixedFlight = null;
    
    try {
      // Базовая валидация длины строки
      if (line.length < 75) {
        errors.push({
          code: 'LENGTH_ERROR',
          message: `Недостаточная длина строки: ${line.length} (минимум 75 символов)`
        });
        
        // В строгом режиме выходим сразу при ошибке длины
        if (this.options.strictMode) {
          return { isValid: false, errors, flight: null };
        }
      }

      // Извлечение данных по позициям
      const extractField = (field) => {
        if (!this.ssimFormat[field] || line.length < this.ssimFormat[field][1]) {
          return '';
        }
        return line.substring(this.ssimFormat[field][0], this.ssimFormat[field][1]).trim();
      };

      // Базовые поля
      const airline = extractField('airlineDesignator');
      const flightNumber = extractField('flightNumber');
      const fullFlightNumber = `${airline}${flightNumber}`;
      
      // Валидация авиакомпании
      if (this.options.strictMode && !this.airlineDesignators.has(airline)) {
        errors.push({
          code: 'INVALID_AIRLINE',
          message: `Неизвестный код авиакомпании: ${airline}`
        });
      }
      
      // Парсинг периода операций
      const startDateStr = extractField('periodStart');
      const endDateStr = extractField('periodEnd');
      
      let startDate = this.parseSSIMDate(startDateStr);
      let endDate = this.parseSSIMDate(endDateStr);
      
      // Проверка дат
      let periodValid = true;
      
      if (!startDate) {
        errors.push({
          code: 'INVALID_START_DATE',
          message: `Некорректная дата начала для рейса ${fullFlightNumber}: ${startDateStr}`
        });
        periodValid = false;
      }
      
      if (!endDate) {
        errors.push({
          code: 'INVALID_END_DATE',
          message: `Некорректная дата окончания для рейса ${fullFlightNumber}: ${endDateStr}`
        });
        periodValid = false;
      }
      
      // Проверка последовательности дат
      if (startDate && endDate && startDate > endDate) {
        errors.push({
          code: 'INVALID_PERIOD',
          message: `Некорректный период для рейса ${fullFlightNumber}: начало (${startDateStr}) после конца (${endDateStr})`
        });
        
        // Исправляем, меняя местами
        if (this.options.autoFix) {
          [startDate, endDate] = [endDate, startDate];
        } else {
          periodValid = false;
        }
      }
      
      // Если период невалидный и включено автоисправление, используем глобальный
      if (!periodValid && this.options.autoFix) {
        startDate = new Date(globalPeriod.startDate);
        endDate = new Date(globalPeriod.endDate);
        this.log(`Применен глобальный период для рейса ${fullFlightNumber}`);
      }
      
      // Парсинг аэропортов
      const depAirport = extractField('departureStation');
      const arrAirport = extractField('arrivalStation');
      
      // Валидация аэропортов в строгом режиме
      if (this.options.strictMode) {
        if (!this.airports.has(depAirport)) {
          errors.push({
            code: 'INVALID_DEP_AIRPORT',
            message: `Неизвестный аэропорт вылета: ${depAirport}`
          });
        }
        
        if (!this.airports.has(arrAirport)) {
          errors.push({
            code: 'INVALID_ARR_AIRPORT',
            message: `Неизвестный аэропорт прилета: ${arrAirport}`
          });
        }
      }
      
      // Парсинг времени и часовых поясов
      const depTimeStr = extractField('departureTime');
      const depUTCStr = extractField('departureUTC');
      const arrTimeStr = extractField('arrivalTime');
      const arrUTCStr = extractField('arrivalUTC');
      
      // Создание объектов даты/времени для вылета и прилета
      let departureDatetime = null;
      let arrivalDatetime = null;
      
      if (startDate) {
        departureDatetime = this.combineDateAndTime(
          startDate, 
          depTimeStr, 
          depUTCStr
        );
        
        if (!departureDatetime) {
          errors.push({
            code: 'INVALID_DEP_TIME',
            message: `Некорректное время вылета для рейса ${fullFlightNumber}: ${depTimeStr} ${depUTCStr}`
          });
        }
        
        arrivalDatetime = this.combineDateAndTime(
          startDate, 
          arrTimeStr, 
          arrUTCStr
        );
        
        if (!arrivalDatetime) {
          errors.push({
            code: 'INVALID_ARR_TIME',
            message: `Некорректное время прилета для рейса ${fullFlightNumber}: ${arrTimeStr} ${arrUTCStr}`
          });
        }
        
        // Проверка последовательности времен (с учетом возможного пересечения суток)
        if (departureDatetime && arrivalDatetime && arrivalDatetime < departureDatetime) {
          // Предполагаем, что это пересечение суток (прилет на следующий день)
          arrivalDatetime.setDate(arrivalDatetime.getDate() + 1);
          this.log(`Скорректировано время прилета для рейса ${fullFlightNumber} (пересечение суток)`);
        }
      }
      
      // Парсинг дней операций
      const daysOfOperationStr = extractField('daysOfOperation');
      const daysOfOperation = this.parseDaysOfOperation(daysOfOperationStr);
      
      if (daysOfOperation.length === 0 && daysOfOperationStr.length > 0) {
        errors.push({
          code: 'INVALID_DAYS',
          message: `Некорректные дни операций для рейса ${fullFlightNumber}: ${daysOfOperationStr}`
        });
      }
      
      // Тип воздушного судна
      const aircraftType = extractField('aircraftType');
      
      if (this.options.strictMode && !this.aircraftTypes.has(aircraftType)) {
        errors.push({
          code: 'INVALID_AIRCRAFT',
          message: `Неизвестный тип воздушного судна: ${aircraftType}`
        });
      }
      
      // Создаем объект рейса
      const flight = {
        airlineCode: airline,
        flightNumber: flightNumber,
        fullFlightNumber: fullFlightNumber,
        departure: {
          airport: depAirport,
          time: this.formatTime(depTimeStr),
          timeZone: depUTCStr
        },
        arrival: {
          airport: arrAirport,
          time: this.formatTime(arrTimeStr),
          timeZone: arrUTCStr
        },
        departureDatetime: departureDatetime ? this.formatDateToISOString(departureDatetime) : null,
        arrivalDatetime: arrivalDatetime ? this.formatDateToISOString(arrivalDatetime) : null,
        aircraftType: aircraftType,
        period: {
          startDate: startDate ? this.formatDateToISOString(startDate, true) : null,
          endDate: endDate ? this.formatDateToISOString(endDate, true) : null,
          originalStartDate: startDateStr,
          originalEndDate: endDateStr
        },
        daysOfOperation: daysOfOperation,
        rawLine: this.options.preserveRawData ? line : undefined
      };
      
      // Если были ошибки и включено автоисправление, создаем исправленную версию
      if (errors.length > 0 && this.options.autoFix) {
        fixedFlight = this.createFixedFlight(flight, errors, globalPeriod);
      }
      
      // Результат парсинга
      return {
        isValid: errors.length === 0,
        flight: flight,
        fixedFlight: fixedFlight,
        errors: errors
      };
    } catch (error) {
      this.logError('Ошибка при парсинге рейса:', error);
      errors.push({
        code: 'PARSING_ERROR',
        message: `Непредвиденная ошибка при парсинге: ${error.message}`
      });
      
      return {
        isValid: false,
        flight: null,
        errors: errors
      };
    }
  }

  /**
   * Создает исправленную версию рейса на основе ошибок
   * @param {Object} flight - Исходный объект рейса
   * @param {Array} errors - Массив ошибок
   * @param {Object} globalPeriod - Глобальный период
   * @returns {Object} Исправленный рейс
   */
  createFixedFlight(flight, errors, globalPeriod) {
    const fixedFlight = JSON.parse(JSON.stringify(flight));
    fixedFlight.isFixed = true;
    
    // Применяем исправления в зависимости от типов ошибок
    for (const error of errors) {
      switch (error.code) {
        case 'INVALID_START_DATE':
        case 'INVALID_END_DATE':
        case 'INVALID_PERIOD':
          // Используем глобальный период
          fixedFlight.period.startDate = globalPeriod.startDate;
          fixedFlight.period.endDate = globalPeriod.endDate;
          break;
          
        case 'INVALID_DEP_TIME':
          fixedFlight.departure.time = '00:00';
          break;
          
        case 'INVALID_ARR_TIME':
          fixedFlight.arrival.time = '01:00';
          break;
      }
    }
    
    // Пересчитываем datetime, если были изменения в периоде
    if (fixedFlight.period.startDate !== flight.period.startDate) {
      const baseDate = new Date(fixedFlight.period.startDate);
      
      // Парсим время вылета
      const depTime = fixedFlight.departure.time.split(':');
      const depHours = parseInt(depTime[0], 10);
      const depMinutes = parseInt(depTime[1], 10);
      
      // Создаем новый datetime
      const depDatetime = new Date(baseDate);
      depDatetime.setHours(depHours, depMinutes, 0, 0);
      fixedFlight.departureDatetime = this.formatDateToISOString(depDatetime);
      
      // То же для прилета
      const arrTime = fixedFlight.arrival.time.split(':');
      const arrHours = parseInt(arrTime[0], 10);
      const arrMinutes = parseInt(arrTime[1], 10);
      
      const arrDatetime = new Date(baseDate);
      arrDatetime.setHours(arrHours, arrMinutes, 0, 0);
      
      // Если время прилета раньше времени вылета, добавляем день
      if (arrHours < depHours || (arrHours === depHours && arrMinutes < depMinutes)) {
        arrDatetime.setDate(arrDatetime.getDate() + 1);
      }
      
      fixedFlight.arrivalDatetime = this.formatDateToISOString(arrDatetime);
    }
    
    // Рассчитываем длительность полета
    fixedFlight.duration = this.calculateDuration(
      fixedFlight.departureDatetime, 
      fixedFlight.arrivalDatetime
    );
    
    return fixedFlight;
  }

  /**
   * Парсит дату в формате SSIM (DDMMMYY)
   * @param {string} dateStr - Строка даты
   * @returns {Date|null} Объект Date или null при ошибке
   */
  parseSSIMDate(dateStr) {
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
      const monthIndex = this.monthMap[monthCode];
      
      if (monthIndex === undefined) {
        return null;
      }

      // Преобразуем год в полный формат (20xx)
      const fullYear = 2000 + parseInt(year, 10);
      
      // Создаем дату
      const date = new Date(fullYear, monthIndex, parseInt(day, 10));
      
      // Проверяем валидность даты (например, 31FEB будет скорректировано в JS)
      if (date.getDate() !== parseInt(day, 10)) {
        return null; // Невалидная дата (например, 31 февраля)
      }
      
      return date;
    } catch (error) {
      this.logError('Ошибка при парсинге даты:', error);
      return null;
    }
  }

  /**
   * Комбинирует дату и время с учетом часового пояса
   * @param {Date} baseDate - Базовая дата
   * @param {string} timeStr - Строка времени (HHMM)
   * @param {string} timeZone - Часовой пояс ([+-]HHMM)
   * @returns {Date|null} Скомбинированная дата/время
   */
  combineDateAndTime(baseDate, timeStr, timeZone) {
    try {
      if (!baseDate || !timeStr || timeStr.length !== 4) {
        return null;
      }

      // Создаем копию даты
      const datetime = new Date(baseDate);
      
      // Парсим время
      const hours = parseInt(timeStr.substring(0, 2), 10);
      const minutes = parseInt(timeStr.substring(2, 4), 10);
      
      if (isNaN(hours) || hours < 0 || hours > 23 || 
          isNaN(minutes) || minutes < 0 || minutes > 59) {
        return null;
      }
      
      datetime.setHours(hours, minutes, 0, 0);

      // Обработка часового пояса
      if (timeZone && timeZone.length === 5) {
        const sign = timeZone.charAt(0);
        
        if (sign === '+' || sign === '-') {
          const offsetHours = parseInt(timeZone.substring(1, 3), 10);
          const offsetMinutes = parseInt(timeZone.substring(3, 5), 10);
          
          if (!isNaN(offsetHours) && !isNaN(offsetMinutes)) {
            const totalOffsetMinutes = (offsetHours * 60 + offsetMinutes) * 
                                       (sign === '+' ? -1 : 1);
                                       
            // Применяем смещение
            datetime.setMinutes(datetime.getMinutes() + totalOffsetMinutes);
          }
        }
      } else if (timeZone === 'UTC') {
        // UTC не требует корректировки
      }

      return datetime;
    } catch (error) {
      this.logError('Ошибка при комбинировании даты и времени:', error);
      return null;
    }
  }

  /**
   * Форматирует время из HHMM в HH:MM
   * @param {string} timeStr - Строка времени (HHMM)
   * @returns {string} Отформатированное время (HH:MM)
   */
  formatTime(timeStr) {
    if (!timeStr || timeStr.length !== 4) {
      return '00:00';
    }
    
    // Дополнительная проверка на валидность
    const hours = parseInt(timeStr.substring(0, 2), 10);
    const minutes = parseInt(timeStr.substring(2, 4), 10);
    
    if (isNaN(hours) || hours < 0 || hours > 23 || 
        isNaN(minutes) || minutes < 0 || minutes > 59) {
      return '00:00';
    }
    
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
  }

  /**
   * Парсит дни операций
   * @param {string} daysStr - Строка дней (например, "1234567" или "135")
   * @returns {Array} Массив объектов дней недели
   */
  parseDaysOfOperation(daysStr) {
    if (!daysStr) {
      return [];
    }
    
    // Нормализуем строку (удаляем пробелы и другие символы)
    const normalizedStr = daysStr.replace(/[^1-7]/g, '');
    
    // Преобразуем в массив дней
    const days = [];
    
    for (let i = 0; i < normalizedStr.length; i++) {
      const dayCode = normalizedStr.charAt(i);
      
      if (this.daysOfWeekMap[dayCode]) {
        days.push({
          code: dayCode,
          name: this.daysOfWeekMap[dayCode]
        });
      }
    }
    
    return days;
  }

  /**
   * Рассчитывает продолжительность полета
   * @param {string} departureDatetime - Время вылета в ISO формате
   * @param {string} arrivalDatetime - Время прилета в ISO формате
   * @returns {string} Продолжительность полета в формате "HH:MM"
   */
  calculateDuration(departureDatetime, arrivalDatetime) {
    try {
      if (!departureDatetime || !arrivalDatetime) {
        return '00:00';
      }
      
      const departure = new Date(departureDatetime);
      const arrival = new Date(arrivalDatetime);
      
      if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
        return '00:00';
      }
      
      const diffMs = arrival - departure;
      
      if (diffMs < 0) {
        // Время прилета раньше времени вылета, возможно ошибка
        return '00:00';
      }
      
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      this.logError('Ошибка при расчете продолжительности:', error);
      return '00:00';
    }
  }

  /**
   * Подготавливает рейсы для диаграммы Ганта
   * @param {Array} flights - Массив рейсов
   * @returns {Array} Подготовленные рейсы для визуализации
   */
  prepareFlightsForGanttChart(flights) {
    return flights.map(flight => {
      // Создаем уникальный идентификатор ВС для графика
      const aircraftId = flight.isFixed 
        ? `${flight.aircraftType} - ${flight.airlineCode}${Math.floor(Math.random() * 900) + 100} (исправлен)`
        : `${flight.aircraftType} - ${flight.airlineCode}${Math.floor(Math.random() * 900) + 100}`;
      
      // Рассчитываем продолжительность, если это не было сделано ранее
      const duration = flight.duration || 
                       this.calculateDuration(flight.departureDatetime, flight.arrivalDatetime);
      
      // Дополнительные поля для графика
      return {
        ...flight,
        aircraftId,
        duration,
        status: flight.isFixed ? 'fixed' : 'normal',
        displayColor: flight.isFixed ? '#FFA726' : '#4CAF50'
      };
    });
  }

  /**
   * Форматирует объект Date в строку ISO
   * @param {Date} date - Объект даты
   * @param {boolean} dateOnly - Только дата без времени
   * @returns {string} Отформатированная строка
   */
  formatDateToISOString(date, dateOnly = false) {
    if (!date || isNaN(date.getTime())) {
      return null;
    }
    
    const isoString = date.toISOString();
    return dateOnly ? isoString.split('T')[0] : isoString;
  }

  /**
   * Обнуляет счетчики статистики
   */
  resetStats() {
    this.stats = {
      totalLines: 0,
      validFlights: 0,
      invalidFlights: 0,
      fixedFlights: 0,
      errors: {}
    };
  }

  /**
   * Логирование обычных сообщений
   * @param {string} message - Сообщение для лога
   */
  log(message) {
    if (this.options.verboseLogging) {
      console.log(`[SSIMParser] ${message}`);
    }
  }

  /**
   * Логирование ошибок
   * @param {string} message - Сообщение об ошибке
   * @param {Error} error - Объект ошибки
   */
  logError(message, error) {
    console.error(`[SSIMParser] ${message}`, error);
  }
}

export default SSIMParser;
