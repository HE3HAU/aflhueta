import React, { useState, useEffect } from 'react';
import FlightGanttChart from '../components/FlightGanttChart/FlightGanttChart';
import { generateSchedule } from '../utils/ssimParser/index';

const FlightsPage = () => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  // Загрузка данных о рейсах
  useEffect(() => {
    const loadFlights = () => {
      setLoading(true);
      setError('');
      
      try {
        // Получаем данные из localStorage
        const storedData = localStorage.getItem('flightsData');
        console.log('Данные из localStorage:', storedData ? 'найдены' : 'не найдены');
        
        if (storedData) {
          const data = JSON.parse(storedData);
          console.log(`Найдено ${data.flights.length} рейсов в хранилище`);
          
          // Проверка наличия рейсов
          if (data.flights && data.flights.length > 0) {
            // Определяем период на основе минимальной и максимальной даты в данных
            let earliestDate = null;
            let latestDate = null;
            
            // Находим минимальные и максимальные даты в рейсах
            for (const flight of data.flights) {
              if (flight.period && flight.period.startDate && flight.period.endDate) {
                const start = new Date(flight.period.startDate);
                const end = new Date(flight.period.endDate);
                
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                  if (!earliestDate || start < earliestDate) {
                    earliestDate = start;
                  }
                  
                  if (!latestDate || end > latestDate) {
                    latestDate = end;
                  }
                }
              }
            }
            
            // Если не удалось определить даты, используем текущий месяц
            if (!earliestDate || !latestDate) {
              console.log('Не удалось определить даты из рейсов, используем текущий месяц');
              const today = new Date();
              earliestDate = new Date(today.getFullYear(), today.getMonth(), 1);
              latestDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            }
            
            // Форматируем даты для функции generateSchedule
            const formattedStartDate = earliestDate.toISOString().split('T')[0];
            const formattedEndDate = latestDate.toISOString().split('T')[0];
            
            console.log(`Период для генерации расписания: ${formattedStartDate} - ${formattedEndDate}`);
            
            // Устанавливаем даты для компонента
            setStartDate(earliestDate);
            setEndDate(latestDate);
            
            // Генерируем расписание на основе данных SSIM
            const schedule = generateSchedule(
              data.flights, 
              formattedStartDate, 
              formattedEndDate
            );
            
            console.log(`Сгенерировано ${schedule.length} рейсов для отображения`);
            
            if (schedule.length > 0) {
              // Выводим в консоль первые несколько рейсов для отладки
              schedule.slice(0, 5).forEach((flight, index) => {
                console.log(`Рейс ${index + 1} в расписании: ${flight.fullFlightNumber}, ${flight.departure.airport}-${flight.arrival.airport}, дата: ${new Date(flight.departureDatetime).toISOString()}`);
              });
              
              setFlights(schedule);
              setLoading(false);
            } else {
              setError('Не удалось создать расписание из загруженного файла. Проверьте формат данных.');
              setLoading(false);
            }
          } else {
            setError('Данные рейсов отсутствуют. Пожалуйста, загрузите SSIM-файл на странице загрузки.');
            setLoading(false);
          }
        } else {
          // Если данных нет в localStorage
          setError('Данные расписания не найдены. Пожалуйста, загрузите SSIM-файл на странице загрузки.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError(`Произошла ошибка при загрузке расписания рейсов: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadFlights();
  }, []);
  
  return (
    <div className="flights-page">
      <h2>Расписание рейсов</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="loading">
          Загрузка расписания...
        </div>
      ) : (
        <>
          {flights.length > 0 ? (
            <>
              <div className="gantt-chart-container">
                <FlightGanttChart 
                  flights={flights} 
                  startDate={startDate} 
                  endDate={endDate} 
                />
              </div>
              
              <div className="flights-stats">
                <div className="card">
                  <h3>Статистика расписания</h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-value">{flights.length}</div>
                      <div className="stat-label">Всего рейсов</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {new Set(flights.map(f => f.aircraftId)).size}
                      </div>
                      <div className="stat-label">Активных бортов</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {new Set(flights.map(f => f.departure.airport)).size}
                      </div>
                      <div className="stat-label">Аэропортов вылета</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {new Set(flights.map(f => f.arrival.airport)).size}
                      </div>
                      <div className="stat-label">Аэропортов прилета</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data-message">
              <p>Нет данных для отображения. Пожалуйста, загрузите SSIM-файл на странице загрузки.</p>
              <a href="/upload" className="navigation-button">Перейти на страницу загрузки</a>
            </div>
          )}
        </>
      )}
      
      <style>
        {`
          .error-message {
            padding: 10px;
            background-color: #ffebee;
            border-left: 4px solid #f44336;
            margin-bottom: 20px;
          }
          
          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            font-size: 16px;
            color: #757575;
          }
          
          .gantt-chart-container {
            margin-bottom: 20px;
          }
          
          .flights-stats {
            margin-bottom: 20px;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          
          .stat-item {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            text-align: center;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #1976d2;
            margin-bottom: 5px;
          }
          
          .stat-label {
            color: #555;
            font-size: 14px;
          }
          
          .no-data-message {
            padding: 20px;
            background-color: #e8f5e9;
            border-radius: 4px;
            margin: 20px 0;
            text-align: center;
          }
          
          .navigation-button {
            display: inline-block;
            margin-top: 10px;
            padding: 10px 15px;
            background-color: #1976d2;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
          }
          
          .navigation-button:hover {
            background-color: #1565c0;
          }
        `}
      </style>
    </div>
  );
};

export default FlightsPage;
