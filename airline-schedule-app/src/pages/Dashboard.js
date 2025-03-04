import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalFlights: 0,
    activeBortsCount: 0,
    todayFlights: 0,
    lastUpdate: null
  });

  useEffect(() => {
    // Загрузка реальных данных из localStorage
    const loadData = () => {
      try {
        const storedData = localStorage.getItem('flightsData');
        if (storedData) {
          const data = JSON.parse(storedData);
          
          // Если есть данные, считаем статистику
          if (data && data.flights && data.flights.length > 0) {
            // Количество рейсов
            const totalFlights = data.flights.length;
            
            // Количество уникальных бортов
            const activeBortsCount = new Set(
              data.flights.map(flight => flight.aircraftId)
            ).size;
            
            // Рейсы на сегодня (приблизительная оценка)
            // В реальном приложении нужно учитывать дни операций и генерировать расписание
            const today = new Date().toISOString().split('T')[0];
            const todayFlights = data.flights.filter(flight => {
              if (!flight.period || !flight.period.startDate || !flight.period.endDate) {
                return false;
              }
              
              const startDate = flight.period.startDate;
              const endDate = flight.period.endDate;
              
              return startDate <= today && today <= endDate;
            }).length;
            
            setStats({
              totalFlights,
              activeBortsCount,
              todayFlights,
              lastUpdate: new Date(data.timestamp).toLocaleString('ru-RU')
            });
            
            return;
          }
        }
        
        // Если данных нет, используем демо-значения
        setStats({
          totalFlights: 0,
          activeBortsCount: 0,
          todayFlights: 0,
          lastUpdate: 'Нет данных'
        });
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        
        // В случае ошибки, используем демо-значения
        setStats({
          totalFlights: 0,
          activeBortsCount: 0,
          todayFlights: 0,
          lastUpdate: 'Ошибка при загрузке'
        });
      }
    };
    
    loadData();
  }, []);

  return (
    <div className="dashboard-page">
      <h2>Панель управления</h2>
      
      <div className="stats-container">
        <div className="stats-card card">
          <h3>Статистика рейсов</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.totalFlights}</div>
              <div className="stat-label">Всего рейсов</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.activeBortsCount}</div>
              <div className="stat-label">Активных бортов</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.todayFlights}</div>
              <div className="stat-label">Рейсов сегодня</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.lastUpdate || 'Загрузка...'}</div>
              <div className="stat-label">Последнее обновление</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="quick-actions card">
        <h3>Быстрые действия</h3>
        <div className="actions-buttons">
          <Link to="/flights" className="action-button">
            Просмотр расписания
          </Link>
          <Link to="/upload" className="action-button">
            Загрузить SSIM-файл
          </Link>
        </div>
      </div>
      
      <style>{`
        .stats-container {
          margin-bottom: 20px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        
        .actions-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-top: 15px;
        }
        
        .action-button {
          padding: 10px 20px;
          background-color: #1976d2;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .action-button:hover {
          background-color: #1565c0;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
