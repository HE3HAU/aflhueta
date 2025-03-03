import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  return (
    <nav className="navigation">
      <div className="nav-header">
        <h3>Меню</h3>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
            Панель управления
          </NavLink>
        </li>
        <li>
          <NavLink to="/flights" className={({ isActive }) => (isActive ? 'active' : '')}>
            Расписание рейсов
          </NavLink>
        </li>
        <li>
          <NavLink to="/upload" className={({ isActive }) => (isActive ? 'active' : '')}>
            Загрузка SSIM
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;