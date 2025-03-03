import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <h1>Расписание рейсов авиакомпании</h1>
        </div>
        <div className="header-info">
          <div className="date-info">
            {new Date().toLocaleDateString('ru-RU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="user-info">
            <span className="user-name">Администратор</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;