import React, { useState, useEffect } from 'react';
import './FlightGanttChart.css';
import { generateSchedule } from '../../utils/ssimParser/index';

const FlightGanttChart = ({ flights = [], startDate, endDate }) => {
  const [visibleFlights, setVisibleFlights] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [dateLabels, setDateLabels] = useState([]);
  const [viewType, setViewType] = useState('weekly');
  const [currentStartDate, setCurrentStartDate] = useState(new Date());
  const [currentEndDate, setCurrentEndDate] = useState(new Date());
  
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
    console.log('Период:', currentStartDate, currentEndDate);
    
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
        // Если есть конкретное время вылета
        if (typeof flight.departureDatetime === 'string') {
          departureDate = new Date(flight.departureDatetime);
        } else {
          departureDate = new Date(flight.departureDatetime);
        }
      } else if (flight.departure && flight.departure.time) {
        // Если есть только время, предполагаем текущую дату
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
    switch(type) {
      case 'daily':
        incrementDays = 0;
        slotWidth = 60; // в пикселях, для почасового отображения
        break;
      case 'weekly':
        incrementDays = 1;
        slotWidth = 180; // в пикселях, для дневного отображения
        break;
      case 'monthly':
        incrementDays = 1;
        slotWidth = 35; // в пикселях, компактное дневное отображение
        break;
      default:
        incrementDays = 1;
        slotWidth = 180;
    }
    
    // Создание временных интервалов
    let current = new Date(startDateTime);
    current.setHours(0, 0, 0, 0);
    
    if (type === 'daily') {
      // Для суточного представления создаем 24 часовых слота
      for (let hour = 0; hour < 24; hour++) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          width: slotWidth
        });
      }
      
      // Добавляем метку даты
      labels.push({
        date: formatDate(current),
        dayOfWeek: formatDayOfWeek(current)
      });
    } else {
      // Для недельного и месячного представления
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
  
  // Навигация по датам
  const handleNavigate = (direction) => {
    const difference = currentEndDate - currentStartDate;
    const days = Math.ceil(difference / (1000 * 60 * 60 * 24)) + 1;
    
    const newStartDate = new Date(currentStartDate);
    const newEndDate = new Date(currentEndDate);
    
    if (direction === 'prev') {
      newStartDate.setDate(newStartDate.getDate() - days);
      newEndDate.setDate(newEndDate.getDate() - days);
    } else {
      newStartDate.setDate(newStartDate.getDate() + days);
      newEndDate.setDate(newEndDate.getDate() + days);
    }
    
    setCurrentStartDate(newStartDate);
    setCurrentEndDate(newEndDate);
  };
  
  // Изменение типа представления
  const changeViewType = (type) => {
    setViewType(type);
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
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - today.getDay() + 1); // Понедельник текущей недели
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newStartDate.getDate() + 6); // Воскресенье текущей недели
        break;
      case 'monthly':
        newStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        newEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        return;
    }
    
    setCurrentStartDate(newStartDate);
    setCurrentEndDate(newEndDate);
  };
  
  // Группировка рейсов по бортам
  const groupedFlights = () => {
    const groups = {};
    
    visibleFlights.forEach(flight => {
      // Используем номер борта и тип ВС для группировки
      const aircraftId = flight.aircraftId || 'unknown';
      
      if (!groups[aircraftId]) {
        groups[aircraftId] = {
          aircraftId,
          aircraftType: flight.aircraftType || 'Неизвестно',
          flights: []
        };
      }
      
      groups[aircraftId].flights.push(flight);
    });
    
    // Отладочная информация о группировке
    console.log(`Сгруппировано ${Object.keys(groups).length} бортов ВС из ${visibleFlights.length} рейсов`);
    
    return Object.values(groups).sort((a, b) => 
      a.aircraftId.localeCompare(b.aircraftId)
    );
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
      arrivalTime = combineDateAndTime(currentStartDate, flight.arrival.time);
      
      // Если время прилета меньше времени вылета, считаем, что рейс прибывает на следующий день
      if (arrivalTime < departureTime) {
        arrivalTime.setDate(arrivalTime.getDate() + 1);
      }
    }
    
    // Добавляем отладочную информацию
    console.log(`Расчет позиции для рейса: ${flight.fullFlightNumber}`);
    console.log(`Маршрут: ${flight.departure.airport} - ${flight.arrival.airport}`);
    console.log(`Время вылета: ${departureTime.toISOString()}`);
    console.log(`Время прилета: ${arrivalTime.toISOString()}`);
    
    if (viewType === 'daily') {
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
      
      const left = (startHour + startMinutes) * slotWidth;
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
      // Для недельного и месячного представления
      // Определяем день вылета относительно начальной даты
      const startOfPeriod = new Date(currentStartDate);
      startOfPeriod.setHours(0, 0, 0, 0);
      
      const departureDay = new Date(departureTime);
      departureDay.setHours(0, 0, 0, 0);
      
      const diffDays = Math.round((departureDay - startOfPeriod) / (1000 * 60 * 60 * 24));
      
      console.log(`День вылета относительно начала периода: ${diffDays}`);
      console.log(`Общее количество дней в отображаемом периоде: ${timeSlots.length}`);
      
      // Проверяем, находится ли дата в пределах отображаемого периода
      if (diffDays < 0 || diffDays >= timeSlots.length) {
        console.log(`Рейс ${flight.fullFlightNumber} вне периода отображения`);
        return { left: 0, width: 0, isHidden: true };
      }
      
      // Определяем продолжительность в днях
      const arrivalDay = new Date(arrivalTime);
      arrivalDay.setHours(0, 0, 0, 0);
      
      const durationDays = Math.max(1, Math.round((arrivalDay - departureDay) / (1000 * 60 * 60 * 24)) + 1);
      
      // Обрезаем продолжительность, если она выходит за пределы отображаемого периода
      const visibleDays = Math.min(durationDays, timeSlots.length - diffDays);
      
      const slotWidth = viewType === 'weekly' ? 180 : 35; // ширина 1 дня в пикселях
      
      const left = diffDays * slotWidth;
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
  
  // Получаем цвет для рейса
  const getFlightColor = (flight) => {
    // Генерируем цвет на основе номера рейса или аэропорта назначения
    const seed = flight.fullFlightNumber || flight.arrival?.airport || 'default';
    let hash = 0;
    
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Выбираем из заранее определенных цветов
    const colors = [
      '#4285F4', '#EA4335', '#FBBC05', '#34A853', // Google colors
      '#039BE5', '#7B1FA2', '#C2185B', '#00897B', // Material colors
      '#FFA000', '#C62828', '#2E7D32', '#283593'  // Deep colors
    ];
    
    return colors[Math.abs(hash) % colors.length];
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
            className={viewType === 'daily' ? 'active' : ''} 
            onClick={() => changeViewType('daily')}
          >
            День
          </button>
          <button 
            className={viewType === 'weekly' ? 'active' : ''} 
            onClick={() => changeViewType('weekly')}
          >
            Неделя
          </button>
          <button 
            className={viewType === 'monthly' ? 'active' : ''} 
            onClick={() => changeViewType('monthly')}
          >
            Месяц
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
        <div className="time-scale">
          <div className="time-scale-labels">
            {dateLabels.map((label, index) => (
              <div key={index} className="date-label" style={{ 
                left: `${index * (viewType === 'weekly' ? 180 : (viewType === 'daily' ? 0 : 35))}px`,
                width: viewType === 'daily' ? '100%' : 'auto'
              }}>
                {viewType === 'daily' ? (
                  <span>{label.date} ({label.dayOfWeek})</span>
                ) : (
                  <>
                    <div className="date">{label.date}</div>
                    <div className="day">{label.dayOfWeek}</div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="time-slots">
            {timeSlots.map((slot, index) => (
              <div 
                key={index} 
                className={`time-slot ${slot.isWeekend ? 'weekend' : ''}`} 
                style={{ width: `${slot.width}px` }}
              >
                {slot.time}
              </div>
            ))}
          </div>
        </div>
        
        {/* Группы рейсов по ВС */}
        <div className="flights-container">
          {groupedFlights().map((group, groupIndex) => (
            <div key={groupIndex} className="aircraft-group">
              <div className="aircraft-label">
                {group.aircraftType} - {group.aircraftId}
              </div>
              <div className="flights-row">
                {group.flights.map((flight, flightIndex) => {
                  const { left, width, isNextDay, isHidden } = calculateFlightPosition(flight);
                  if (isHidden) return null; // Не отображаем скрытые рейсы
                  
                  const flightColor = getFlightColor(flight);
                  
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
                  
                  // Для отладки добавим консольный вывод для первых нескольких рейсов
                  if (flightIndex < 5) {
                    console.log(`Рендеринг рейса: ${flight.fullFlightNumber}, Позиция: left=${left}px, width=${width}px`);
                  }
                  
                  return (
                    <div 
                      key={flightIndex} 
                      className={`flight-block ${isNextDay ? 'continues' : ''}`}
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
                      {viewType === 'daily' && typeof departureHours !== 'undefined' && (
                        <div className="flight-time">
                          {departureHours}:{departureMinutes.toString().padStart(2, '0')}
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
