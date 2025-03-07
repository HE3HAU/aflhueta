import React, { useState, useEffect } from 'react';
import './FlightGanttChart.css';

const FlightGanttChart = ({ flights = [], startDate, endDate }) => {
  const [visibleFlights, setVisibleFlights] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [dateLabels, setDateLabels] = useState([]);
  const [viewType, setViewType] = useState('weekly');
  const [currentStartDate, setCurrentStartDate] = useState(new Date());
  const [currentEndDate, setCurrentEndDate] = useState(new Date());
  const [customMode, setCustomMode] = useState(false);
  
  // Инициализация дат при первом рендере
  useEffect(() => {
    if (startDate && endDate) {
      setCurrentStartDate(new Date(startDate));
      setCurrentEndDate(new Date(endDate));
    } else {
      // Если даты не указаны, используем текущую неделю
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Понедельник текущей недели
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье текущей недели
      
      setCurrentStartDate(startOfWeek);
      setCurrentEndDate(endOfWeek);
    }
  }, [startDate, endDate]);
  
  // Обновление временных слотов и фильтрация рейсов при изменении дат или типа представления
  useEffect(() => {
    generateTimeSlots(currentStartDate, currentEndDate, viewType);
    filterFlights();
  }, [currentStartDate, currentEndDate, viewType, flights]);
  
  // Фильтрация рейсов по выбранному диапазону дат
  const filterFlights = () => {
    console.log('Фильтрация рейсов. Всего рейсов:', flights.length);
    console.log('Период:', currentStartDate.toISOString(), currentEndDate.toISOString());
    
    if (!flights || !flights.length) {
      console.log('Нет рейсов для фильтрации');
      setVisibleFlights([]);
      return;
    }
    
    // Для улучшения отладки, выведем формат данных первого рейса
    if (flights.length > 0) {
      console.log('Пример формата данных рейса:', flights[0]);
    }
    
    const start = new Date(currentStartDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(currentEndDate);
    end.setHours(23, 59, 59, 999);
    
    const filtered = flights.filter(flight => {
      // Проверка наличия необходимых данных
      if (!flight.departureDatetime && !flight.departure) {
        return false;
      }
      
      // В зависимости от формата данных рейса
      let departureDate;
      if (flight.departureDatetime) {
        departureDate = new Date(flight.departureDatetime);
      } else if (flight.departure && flight.departure.time) {
        departureDate = combineDateAndTime(currentStartDate, flight.departure.time);
      } else {
        return false;
      }
      
      return departureDate >= start && departureDate <= end;
    });
    
    console.log('Отфильтровано рейсов:', filtered.length);
    setVisibleFlights(filtered);
  };
  
  // Генерация временных интервалов для диаграммы
  const generateTimeSlots = (start, end, type) => {
    const startDateTime = new Date(start);
    const endDateTime = new Date(end);
    const slots = [];
    const labels = [];
    
    // Настройки для разных типов представления
    let incrementDays, slotWidth;
    
    if (type === 'daily' || start.toDateString() === end.toDateString()) {
      // Если выбран режим дня или если начальная и конечная дата совпадают
      incrementDays = 0;
      slotWidth = 60; // в пикселях, для почасового отображения
      
      // Для суточного представления создаем 24 часовых слота
      for (let hour = 0; hour < 24; hour++) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          width: slotWidth
        });
      }
      
      // Добавляем метку даты
      labels.push({
        date: formatDate(startDateTime),
        dayOfWeek: formatDayOfWeek(startDateTime)
      });
    } else {
      // Для диапазона дат или недельного представления
      incrementDays = 1;
      slotWidth = 180; // в пикселях, для дневного отображения
      
      let current = new Date(startDateTime);
      current.setHours(0, 0, 0, 0);
      
      // Для недельного представления и произвольного диапазона
      while (current <= endDateTime) {
        slots.push({
          time: formatDate(current),
          width: slotWidth,
          isWeekend: current.getDay() === 0 || current.getDay() === 6
        });
        
        labels.push({
          date: formatDate(current),
          dayOfWeek: formatDayOfWeek(current)
        });
        
        current.setDate(current.getDate() + incrementDays);
      }
    }
    
    setTimeSlots(slots);
    setDateLabels(labels);
  };
  
  // Форматирование даты
  const formatDate = (date) => {
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };
  
  // Форматирование даты для ввода в input[type="date"]
  const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) 
      month = '0' + month;
    if (day.length < 2) 
      day = '0' + day;

    return [year, month, day].join('-');
  };
  
  // Форматирование дня недели
  const formatDayOfWeek = (date) => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[date.getDay()];
  };
  
  // Форматирование диапазона дат
  const formatDateRange = (start, end) => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return `${start.toLocaleDateString('ru-RU', options)} - ${end.toLocaleDateString('ru-RU', options)}`;
  };
  
  // Обработка выбора начальной даты диапазона
  const handleStartDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    
    // Если выбранная начальная дата больше текущей конечной, устанавливаем конечную равной начальной
    if (selectedDate > currentEndDate) {
      setCurrentEndDate(selectedDate);
    }
    
    setCurrentStartDate(selectedDate);
    setCustomMode(true);
  };
  
  // Обработка выбора конечной даты диапазона
  const handleEndDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    
    // Если выбранная конечная дата меньше текущей начальной, устанавливаем начальную равной конечной
    if (selectedDate < currentStartDate) {
      setCurrentStartDate(selectedDate);
    }
    
    setCurrentEndDate(selectedDate);
    setCustomMode(true);
  };
  
  // Обработка выбора даты через календарь (для режима дня)
  const handleDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    
    if (viewType === 'daily') {
      // Если в режиме дня - устанавливаем выбранную дату
      setCurrentStartDate(selectedDate);
      setCurrentEndDate(selectedDate);
    } else if (viewType === 'weekly') {
      // Если в режиме недели - устанавливаем неделю, в которой находится выбранная дата
      const dayOfWeek = selectedDate.getDay(); // 0 - воскресенье, 1 - понедельник и т.д.
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Сколько дней нужно прибавить до ближайшего понедельника
      
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() + mondayOffset);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      setCurrentStartDate(startOfWeek);
      setCurrentEndDate(endOfWeek);
    } else {
      // Для других случаев
      setCurrentStartDate(selectedDate);
      setCurrentEndDate(selectedDate);
    }
    
    setCustomMode(false);
  };
  
  // Навигация по датам
  const handleNavigate = (direction) => {
    const newStartDate = new Date(currentStartDate);
    const newEndDate = new Date(currentEndDate);
    
    if (customMode) {
      // Для произвольного диапазона
      const diffDays = Math.round((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)) + 1;
      const dayOffset = direction === 'prev' ? -diffDays : diffDays;
      
      newStartDate.setDate(newStartDate.getDate() + dayOffset);
      newEndDate.setDate(newEndDate.getDate() + dayOffset);
    } else if (viewType === 'daily') {
      // Для суточного представления перемещаемся на один день
      const dayOffset = direction === 'prev' ? -1 : 1;
      newStartDate.setDate(newStartDate.getDate() + dayOffset);
      newEndDate.setDate(newEndDate.getDate() + dayOffset);
    } else {
      // Для недельного представления перемещаемся на неделю
      const dayOffset = direction === 'prev' ? -7 : 7;
      newStartDate.setDate(newStartDate.getDate() + dayOffset);
      newEndDate.setDate(newEndDate.getDate() + dayOffset);
    }
    
    setCurrentStartDate(newStartDate);
    setCurrentEndDate(newEndDate);
  };
  
  // Переход к сегодняшнему дню
  const handleGoToToday = () => {
    const today = new Date();
    
    if (customMode) {
      // Сохраняем текущую длину диапазона
      const diffDays = Math.round((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24));
      
      setCurrentStartDate(today);
      const newEndDate = new Date(today);
      newEndDate.setDate(today.getDate() + diffDays);
      setCurrentEndDate(newEndDate);
    } else if (viewType === 'daily') {
      setCurrentStartDate(today);
      setCurrentEndDate(today);
    } else if (viewType === 'weekly') {
      // Находим понедельник текущей недели
      const dayOfWeek = today.getDay(); // 0 - воскресенье, 1 - понедельник и т.д.
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Сколько дней нужно прибавить до ближайшего понедельника
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() + mondayOffset);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      setCurrentStartDate(startOfWeek);
      setCurrentEndDate(endOfWeek);
    } else {
      // Default случай
      setCurrentStartDate(today);
      setCurrentEndDate(today);
    }
  };
  
  // Применение выбора диапазона
  const handleApplyRange = () => {
    setCustomMode(true);
  };
  
  // Изменение типа представления
  const changeViewType = (type) => {
    setViewType(type);
    setCustomMode(false);
    console.log('Изменение типа представления на:', type);
    
    // Корректируем период в зависимости от типа представления
    const today = new Date();
    let newStartDate, newEndDate;
    
    switch(type) {
      case 'daily':
        newStartDate = new Date(today);
        newEndDate = new Date(today);
        break;
      case 'weekly':
        const dayOfWeek = today.getDay(); // 0 - воскресенье, 1 - понедельник и т.д.
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Сколько дней нужно прибавить до ближайшего понедельника
        
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() + mondayOffset);
        
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newStartDate.getDate() + 6);
        break;
      default:
        newStartDate = new Date(today);
        newEndDate = new Date(today);
        break;
    }
    
    setCurrentStartDate(newStartDate);
    setCurrentEndDate(newEndDate);
  };
  
  // Группировка рейсов по бортам с улучшенной сортировкой
  const groupedFlights = () => {
    // Создаем карту для группировки рейсов по воздушному судну
    const groups = {};
    
    // Отображение ключа групп - для предотвращения дублирования в интерфейсе
    const displayedGroups = new Set();
    
    // Сначала распределяем все рейсы по типам ВС
    const aircraftTypes = {};
    
    visibleFlights.forEach(flight => {
      const aircraftType = flight.aircraftType || 'Unknown';
      if (!aircraftTypes[aircraftType]) {
        aircraftTypes[aircraftType] = [];
      }
      
      // Добавляем рейс к соответствующему типу ВС
      aircraftTypes[aircraftType].push(flight);
    });
    
    // Теперь для каждого типа ВС организуем группы без повторений ID
    Object.entries(aircraftTypes).forEach(([aircraftType, flights]) => {
      // Сортируем рейсы по времени вылета
      flights.sort((a, b) => {
        const timeA = new Date(a.departureDatetime);
        const timeB = new Date(b.departureDatetime);
        return timeA - timeB;
      });
      
      // Создаем виртуальные группы для каждого типа самолета
      // Мы будем распределять рейсы по этим группам, чтобы избежать наложений
      const virtualGroups = [];
      
      flights.forEach(flight => {
        // Для каждого рейса определяем его временные интервалы
        const departureTime = new Date(flight.departureDatetime);
        const arrivalTime = new Date(flight.arrivalDatetime);
        
        // Ищем подходящую виртуальную группу для размещения рейса
        let foundGroup = false;
        
        for (let i = 0; i < virtualGroups.length; i++) {
          const group = virtualGroups[i];
          
          // Проверяем, не пересекается ли текущий рейс с другими в этой группе
          let canAddToGroup = true;
          
          for (const existingFlight of group) {
            const existingDeparture = new Date(existingFlight.departureDatetime);
            const existingArrival = new Date(existingFlight.arrivalDatetime);
            
            // Проверка на пересечение временных интервалов
            if (
              (departureTime >= existingDeparture && departureTime <= existingArrival) ||
              (arrivalTime >= existingDeparture && arrivalTime <= existingArrival) ||
              (departureTime <= existingDeparture && arrivalTime >= existingArrival)
            ) {
              canAddToGroup = false;
              break;
            }
          }
          
          // Если можно добавить рейс в эту группу, добавляем
          if (canAddToGroup) {
            group.push(flight);
            foundGroup = true;
            break;
          }
        }
        
        // Если не нашли подходящую группу, создаем новую
        if (!foundGroup) {
          virtualGroups.push([flight]);
        }
      });
      
      // Теперь создаем реальные группы для отображения
      virtualGroups.forEach((groupFlights, index) => {
        // Создаем уникальный идентификатор для группы
        const groupId = `${aircraftType}-${index + 1}`;
        
        // Проверяем, не отображается ли уже эта группа
        if (!displayedGroups.has(groupId)) {
          displayedGroups.add(groupId);
          
          groups[groupId] = {
            aircraftId: groupId,
            aircraftType: aircraftType,
            flights: groupFlights
          };
        }
      });
    });
    
    // Сортировка групп по типу ВС и номеру
    return Object.values(groups).sort((a, b) => {
      // Сначала сортируем по типу ВС
      const typeComparison = a.aircraftType.localeCompare(b.aircraftType);
      if (typeComparison !== 0) {
        return typeComparison;
      }
      
      // Затем по номеру группы
      const aNum = parseInt(a.aircraftId.split('-')[1]);
      const bNum = parseInt(b.aircraftId.split('-')[1]);
      return aNum - bNum;
    });
  };
  
  // Рассчитываем позицию и размер блока рейса
  const calculateFlightPosition = (flight) => {
    if (!timeSlots.length) return { left: 0, width: 0 };
    
    // Получаем даты рейса
    let departureTime, arrivalTime;
    
    // Проверка формата данных
    if (flight.departureDatetime) {
      departureTime = new Date(flight.departureDatetime);
      arrivalTime = new Date(flight.arrivalDatetime);
    } else {
      departureTime = combineDateAndTime(currentStartDate, flight.departure.time);
      
      // Для ночных рейсов прибытие на следующий день
      const arrivalDate = new Date(currentStartDate);
      if (flight.isOvernightFlight) {
        arrivalDate.setDate(arrivalDate.getDate() + 1);
      }
      arrivalTime = combineDateAndTime(arrivalDate, flight.arrival.time);
      
      // Если время прилета меньше времени вылета, считаем, что рейс прибывает на следующий день
      if (arrivalTime < departureTime) {
        arrivalTime.setDate(arrivalTime.getDate() + 1);
      }
    }
    
    // Проверка валидности дат
    if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) {
      console.error(`Некорректные даты для рейса ${flight.fullFlightNumber}`);
      return { left: 0, width: 0, isHidden: true };
    }
    
    // Проверяем, отображаем ли мы один день
    const isSingleDay = timeSlots.length === 24 || 
                        (currentStartDate.toDateString() === currentEndDate.toDateString());
                        
    if (isSingleDay) {
      // Для суточного представления
      const selectedDate = new Date(currentStartDate);
      selectedDate.setHours(0, 0, 0, 0);
      
      const departureDate = new Date(departureTime);
      departureDate.setHours(0, 0, 0, 0);
      
      // Если дата рейса не совпадает с выбранной датой, не показываем рейс
      if (departureDate.getTime() !== selectedDate.getTime()) {
        return { left: 0, width: 0, isHidden: true };
      }
      
      const startHour = departureTime.getHours();
      const startMinutes = departureTime.getMinutes() / 60; // доля часа
      
      const endHour = arrivalTime.getHours();
      const endMinutes = arrivalTime.getMinutes() / 60; // доля часа
      
      // Для рейсов, которые переходят на следующий день
      const isNextDay = arrivalTime.getDate() > departureTime.getDate() ||
        arrivalTime.getMonth() > departureTime.getMonth() ||
        arrivalTime.getFullYear() > departureTime.getFullYear();
      
      const slotWidth = 60; // ширина 1 часа в пикселях
      
      // Добавляем смещение для учета колонки с метками ВС
      const left = 150 + (startHour + startMinutes) * slotWidth;
      let width;
      
      if (isNextDay) {
        // Если рейс заканчивается на следующий день, показываем его до конца текущего дня
        width = (24 - startHour - startMinutes) * slotWidth;
      } else {
        // Иначе показываем полную продолжительность
        width = ((endHour + endMinutes) - (startHour + startMinutes)) * slotWidth;
        // Минимальная ширина блока
        width = Math.max(width, 30);
      }
      
      return { left, width, isNextDay };
    } else {
      // Для недельного представления или диапазона дат
      // Определяем день вылета относительно начальной даты
      const startOfPeriod = new Date(currentStartDate);
      startOfPeriod.setHours(0, 0, 0, 0);
      
      const departureDay = new Date(departureTime);
      departureDay.setHours(0, 0, 0, 0);
      
      const diffMs = departureDay - startOfPeriod;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Проверяем, находится ли дата в пределах отображаемого периода
      if (diffDays < 0 || diffDays >= timeSlots.length) {
        return { left: 0, width: 0, isHidden: true };
      }
      
      // Определяем продолжительность в днях
      const arrivalDay = new Date(arrivalTime);
      arrivalDay.setHours(0, 0, 0, 0);
      
      const durationMs = arrivalDay - departureDay;
      const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
      
      // Обрезаем продолжительность, если она выходит за пределы отображаемого периода
      const visibleDays = Math.min(durationDays, timeSlots.length - diffDays);
      
      const slotWidth = 180; // ширина 1 дня в пикселях для недельного представления и произвольного диапазона
      
      // Добавляем смещение для учета колонки с метками ВС
      const left = 150 + (diffDays * slotWidth);
      const width = visibleDays * slotWidth;
      
      // Для рейсов, которые переходят границу отображаемого периода
      const isNextDay = durationDays > 1;
      
      return { left, width, isNextDay };
    }
  };
  
  // Комбинирует дату и время
  const combineDateAndTime = (date, timeStr) => {
    const result = new Date(date);
    if (!timeStr) return result;
    
    // Обрабатываем разные форматы времени
    let timeParts;
    if (timeStr.includes(' UTC')) {
      timeParts = timeStr.replace(' UTC', '').split(':');
    } else if (timeStr.includes(':')) {
      timeParts = timeStr.split(':');
    } else if (timeStr.length === 4) {
      // Формат HHMM
      timeParts = [timeStr.substring(0, 2), timeStr.substring(2)];
    } else {
      return result;
    }
    
    if (timeParts.length === 2) {
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (!isNaN(hours) && !isNaN(minutes)) {
        result.setHours(hours, minutes, 0, 0);
      }
    }
    
    return result;
  };
  
  // Получаем цвет для рейса (всегда светло-голубой)
  const getFlightColor = () => {
    // Светло-голубой цвет для всех рейсов
    return '#64B5F6'; // Светло-голубой цвет (Material Design Light Blue 300)
  };
  
  // Обработка клика по рейсу
  const handleFlightClick = (flight) => {
    alert(`Рейс: ${flight.fullFlightNumber || flight.flightNumber}\nМаршрут: ${flight.departure.airport} - ${flight.arrival.airport}`);
    // В реальном приложении здесь может быть открытие модального окна с детальной информацией
  };
  
  return (
    <div className="flight-gantt-chart">
      <div className="chart-controls">
        <div className="view-selector">
          <button 
            className={viewType === 'daily' && !customMode ? 'active' : ''} 
            onClick={() => changeViewType('daily')}
          >
            День
          </button>
          <button 
            className={viewType === 'weekly' && !customMode ? 'active' : ''} 
            onClick={() => changeViewType('weekly')}
          >
            Неделя
          </button>
          <button 
            className={customMode ? 'active' : ''} 
            onClick={handleApplyRange}
          >
            Произвольный диапазон
          </button>
        </div>
        
        <div className="date-range-controls">
          <div className="date-picker-group">
            <label>С:</label>
            <input 
              type="date" 
              value={formatDateForInput(currentStartDate)} 
              onChange={handleStartDateChange} 
              className="date-picker"
            />
          </div>
          <div className="date-picker-group">
            <label>По:</label>
            <input 
              type="date" 
              value={formatDateForInput(currentEndDate)} 
              onChange={handleEndDateChange} 
              className="date-picker"
            />
          </div>
          <button onClick={handleGoToToday} className="today-button">
            Сегодня
          </button>
        </div>
        
        <div className="date-navigator">
          <button onClick={() => handleNavigate('prev')}>❮</button>
          <span>{formatDateRange(currentStartDate, currentEndDate)}</span>
          <button onClick={() => handleNavigate('next')}>❯</button>
        </div>
      </div>
      
      <div className="chart-container">
        {/* Шкала времени */}
        <div className="flights-timeline">
          <div className="aircraft-label-spacer"></div>
          <div className="timeline-headers">
            {dateLabels.map((label, index) => (
              <div key={index} className="timeline-day">
                <div className="timeline-date">{label.date}</div>
                <div className="timeline-weekday">{label.dayOfWeek}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Группы рейсов по ВС */}
        <div className="flights-container">
          {groupedFlights().map((group, groupIndex) => (
            <div key={groupIndex} className="aircraft-group">
              <div className="aircraft-label">
                {group.aircraftType} - {group.aircraftId.split('-')[1]}
              </div>
              <div className="flights-row">
                {group.flights.map((flight, flightIndex) => {
                  const { left, width, isNextDay, isHidden } = calculateFlightPosition(flight);
                  if (isHidden) return null; // Не отображаем скрытые рейсы
                  
                  const flightColor = getFlightColor();
                  // Добавляем особую метку для ночных рейсов
                  const isOvernightFlight = flight.isOvernightFlight || isNextDay;
                  
                  // Получаем время вылета для отображения в блоке
                  let departureHours, departureMinutes;
                  if (flight.departureDatetime) {
                    const departureTime = new Date(flight.departureDatetime);
                    departureHours = departureTime.getHours();
                    departureMinutes = departureTime.getMinutes();
                  } else if (flight.departure && flight.departure.time) {
                    const timeParts = flight.departure.time.replace(' UTC', '').split(':');
                    if (timeParts.length === 2) {
                      departureHours = parseInt(timeParts[0], 10);
                      departureMinutes = parseInt(timeParts[1], 10);
                    }
                  }
                  
                  return (
                    <div 
                      key={flightIndex} 
                      className={`flight-block ${isOvernightFlight ? 'continues overnight' : ''}`}
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        backgroundColor: flightColor,
                        borderColor: flightColor
                      }}
                      onClick={() => handleFlightClick(flight)}
                    >
                      <div className="flight-label">
                        {flight.fullFlightNumber}
                      </div>
                      <div className="flight-route">
                        {flight.departure.airport} - {flight.arrival.airport}
                      </div>
                      {(timeSlots.length === 24) && typeof departureHours !== 'undefined' && (
                        <div className="flight-time">
                          {departureHours}:{departureMinutes.toString().padStart(2, '0')}
                          {isOvernightFlight && ' → +1d'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Показываем сообщение, если нет рейсов */}
          {visibleFlights.length === 0 && (
            <div className="no-flights-message">
              Нет рейсов для отображения в выбранном периоде
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlightGanttChart;