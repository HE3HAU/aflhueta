import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { parseSSIMFile, generateSchedule } from '../utils/ssimParser';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalFlights: 0,
    activeBortsCount: 0,
    todayFlights: 0,
    lastUpdate: null
  });

  useEffect(() => {
    // В реальном приложении здесь был бы API-запрос
    // Для демонстрации используем моковые данные
    setTimeout(() => {
      setStats({
        totalFlights: 1250,
        activeBortsCount: 32,
        todayFlights: 86,
        lastUpdate: new Date().toLocaleString('ru-RU')
      });
    }, 1000);
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