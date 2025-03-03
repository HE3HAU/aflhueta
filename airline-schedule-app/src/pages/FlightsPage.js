import React, { useState, useEffect } from 'react';
import FlightGanttChart from '../components/FlightGanttChart/FlightGanttChart';
import { generateSchedule } from '../utils/ssimParser'; // Обновленный импорт

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
            // Определяем период для отображения
            const today = new Date();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            setStartDate(weekStart);
            setEndDate(weekEnd);
            
            // Генерируем расписание на основе данных SSIM
            try {
              console.log(`Генерация расписания с ${weekStart.toISOString().split('T')[0]} по ${weekEnd.toISOString().split('T')[0]}`);
              const schedule = generateSchedule(
                data.flights, 
                weekStart.toISOString().split('T')[0], 
                weekEnd.toISOString().split('T')[0]
              );
              
              console.log(`Сгенерировано ${schedule.length} рейсов в расписании`);
              
              if (schedule.length > 0) {
                setFlights(schedule);
                setLoading(false);
                return; // Важно: выходим из функции, если удалось получить данные
              }
            } catch (err) {
              console.error('Ошибка при генерации расписания:', err);
            }
          }
        }
        
        console.log('Данные не найдены в localStorage или пустые, генерирую демо-рейсы');
        // Если данных нет или их не удалось обработать, только тогда создаем демо-данные
        generateDemoFlights();
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Произошла ошибка при загрузке расписания рейсов');
        
        // Генерируем демо-данные в случае ошибки
        generateDemoFlights();
      } finally {
        setLoading(false);
      }
    };
    
    loadFlights();
  }, []);
  
  // Генерация демонстрационных данных для отображения
  const generateDemoFlights = () => {
    console.log('Генерация демо-рейсов');
    // Определяем период для отображения
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    setStartDate(weekStart);
    setEndDate(weekEnd);
    
    // Генерируем демо-рейсы
    const demoFlights = [];
    const airports = ['SVO', 'LED', 'KZN', 'AER', 'ROV', 'KRR', 'VVO', 'GOJ', 'SVX', 'CEK'];
    const aircraftTypes = ['B737', 'A320', 'SSJ100', 'B777', 'A321'];
    
    // Создаем рейсы для каждого дня недели
    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + day);
      
      // Создаем 10-15 рейсов в день с разными временами вылета
      const flightsCount = 10 + Math.floor(Math.random() * 6);
      
      for (let i = 0; i < flightsCount; i++) {
        // Генерируем случайное время вылета (распределено по всему дню)
        const departureHour = Math.floor(Math.random() * 24);
        const departureMinute = Math.floor(Math.random() * 60);
        
        const departureDate = new Date(date);
        departureDate.setHours(departureHour, departureMinute, 0, 0);
        
        // Продолжительность полета от 1 до 4 часов
        const durationHours = 1 + Math.floor(Math.random() * 3);
        const durationMinutes = Math.floor(Math.random() * 60);
        
        const arrivalDate = new Date(departureDate);
        arrivalDate.setHours(
          departureDate.getHours() + durationHours,
          departureDate.getMinutes() + durationMinutes
        );
        
        // Выбираем случайные аэропорты (разные для вылета и прилета)
        const fromIndex = Math.floor(Math.random() * airports.length);
        let toIndex;
        do {
          toIndex = Math.floor(Math.random() * airports.length);
        } while (toIndex === fromIndex);
        
        // Выбираем случайный тип ВС
        const aircraftType = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
        
        // Генерируем номер рейса и делаем его совместимым с SSIM-форматом (от 1000 до 1999)
        const flightNumber = 1000 + Math.floor(Math.random() * 999);
        
        // Генерируем идентификатор борта
        const aircraftId = `${aircraftType} - A320-SU${100 + Math.floor(Math.random() * 900)}`;
        
        demoFlights.push({
          airlineCode: 'SU',
          flightNumber: flightNumber.toString(),
          fullFlightNumber: `SU${flightNumber}`,
          departure: {
            airport: airports[fromIndex],
            time: `${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')} UTC`
          },
          arrival: {
            airport: airports[toIndex],
            time: `${arrivalDate.getHours().toString().padStart(2, '0')}:${arrivalDate.getMinutes().toString().padStart(2, '0')} UTC`
          },
          departureDatetime: departureDate.toISOString(),
          arrivalDatetime: arrivalDate.toISOString(),
          duration: `${durationHours.toString().padStart(2, '0')}:${durationMinutes.toString().padStart(2, '0')}`,
          aircraftType,
          aircraftId
        });
      }
    }
    
    console.log(`Создано ${demoFlights.length} демо-рейсов`);
    setFlights(demoFlights);
  };
  
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
        `}
      </style>
    </div>
  );
};

export default FlightsPage;