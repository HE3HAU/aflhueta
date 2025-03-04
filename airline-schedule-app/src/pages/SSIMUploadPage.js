import React, { useState } from 'react';
import { parseSSIMFile } from '../utils/ssimParser/index';

const SSIMUploadPage = () => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState([]);

  // Обработка выбора файла
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setParseResult(null);
    setError('');
    setPreviewData([]);
  };

  // Обработка загрузки файла
  const handleFileUpload = async () => {
    if (!file) {
      setError('Пожалуйста, выберите файл.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Чтение содержимого файла
      const content = await readFileContent(file);
      
      // Парсинг SSIM-файла
      const result = parseSSIMFile(content);
      
      if (result.success) {
        setParseResult(result);
        
        // Отладочный вывод для проверки номеров рейсов
        if (result.flights && result.flights.length > 0) {
          console.log("Примеры обработанных рейсов:");
          result.flights.slice(0, 5).forEach((flight, index) => {
            console.log(`${index + 1}. ${flight.fullFlightNumber} (${flight.departure.airport}-${flight.arrival.airport})`);
          });
        }
        
        setPreviewData(result.flights.slice(0, 10)); // Первые 10 рейсов для предпросмотра
      } else {
        setError(`Ошибка при парсинге файла: ${result.error}`);
      }
    } catch (err) {
      setError(`Ошибка при чтении файла: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для чтения содержимого файла
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  // Обработка сохранения данных
  const handleSaveData = () => {
    if (!parseResult || !parseResult.success) {
      setError('Нет данных для сохранения.');
      return;
    }

    // В реальном приложении здесь был бы запрос к API для сохранения данных
    // Для демонстрации просто создадим объект в localStorage
    
    try {
      const flightsData = {
        flights: parseResult.flights,
        timestamp: new Date().toISOString(),
        fileInfo: {
          name: file.name,
          size: file.size,
        }
      };
      
      // Проверка содержимого перед сохранением
      console.log('Сохраняемые данные:', flightsData);
      
      localStorage.setItem('flightsData', JSON.stringify(flightsData));
      
      // Тестовое чтение для проверки
      const test = localStorage.getItem('flightsData');
      console.log('Тестовое чтение:', test ? JSON.parse(test) : 'не найдено');
      
      alert('Данные успешно сохранены в localStorage. В реальном приложении они были бы отправлены на сервер.');
    } catch (err) {
      setError(`Ошибка при сохранении данных: ${err.message}`);
    }
  };

  // Функция для форматирования даты в удобный формат
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="ssim-upload-page">
      <h2>Загрузка SSIM-файла</h2>
      
      <div className="upload-card card">
        <div className="upload-container">
          <div className="file-input-section">
            <input
              type="file"
              id="ssim-file"
              onChange={handleFileChange}
              accept=".txt,.ssim,.csv"
              disabled={isLoading}
            />
            <label htmlFor="ssim-file">
              {file ? file.name : 'Выберите SSIM-файл'}
            </label>
            
            {file && (
              <div className="file-info">
                <p><strong>Имя файла:</strong> {file.name}</p>
                <p><strong>Размер:</strong> {formatFileSize(file.size)}</p>
                <p><strong>Тип:</strong> {file.type || 'text/plain'}</p>
              </div>
            )}
          </div>
          
          <div className="upload-actions">
            <button 
              onClick={handleFileUpload} 
              disabled={!file || isLoading}
              className="upload-button"
            >
              {isLoading ? 'Загрузка...' : 'Проверить файл'}
            </button>
            
            {parseResult && parseResult.success && (
              <button 
                onClick={handleSaveData} 
                className="save-button"
              >
                Сохранить данные
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {parseResult && parseResult.success && (
          <div className="success-message">
            <p>Файл успешно проанализирован!</p>
            <p>Всего рейсов: {parseResult.stats.totalFlights}</p>
            <p>Обработано строк: {parseResult.stats.parsed}</p>
          </div>
        )}
      </div>
      
      {previewData.length > 0 && (
        <div className="preview-section card">
          <h3>Предварительный просмотр данных</h3>
          <div className="table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Рейс</th>
                  <th>Откуда</th>
                  <th>Куда</th>
                  <th>Вылет</th>
                  <th>Прилет</th>
                  <th>Период</th>
                  <th>Дни</th>
                  <th>Борт</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((flight, index) => (
                  <tr key={index}>
                    <td>{flight.fullFlightNumber}</td>
                    <td>{flight.departure.airport}</td>
                    <td>{flight.arrival.airport}</td>
                    <td>{flight.departure.time}</td>
                    <td>{flight.arrival.time}</td>
                    <td>
                      {formatDate(flight.period.startDate)} - {formatDate(flight.period.endDate)}
                    </td>
                    <td>{flight.daysOfOperation.map(day => day.slice(0, 2)).join(', ')}</td>
                    <td>{flight.aircraftType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="instructions-card card">
        <h3>Инструкции по загрузке SSIM-файлов</h3>
        <ol>
          <li>Выберите SSIM-файл для загрузки (формат .txt, .ssim или .csv).</li>
          <li>Нажмите кнопку "Проверить файл" для анализа его содержимого.</li>
          <li>После успешной проверки нажмите "Сохранить данные", чтобы импортировать рейсы.</li>
          <li>Убедитесь, что файл соответствует формату SSIM (Standard Schedules Information Manual).</li>
          <li>При возникновении ошибок проверьте структуру файла и попробуйте снова.</li>
        </ol>
      </div>
      
      <style>
        {`
          .upload-card {
            margin-bottom: 20px;
          }
          
          .upload-container {
            display: flex;
            flex-direction: column;
            margin-bottom: 20px;
          }
          
          .file-input-section {
            margin-bottom: 15px;
          }
          
          input[type="file"] {
            display: none;
          }
          
          label[for="ssim-file"] {
            display: inline-block;
            padding: 10px 15px;
            background-color: #1976d2;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 10px;
          }
          
          .file-info {
            margin-top: 10px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 4px;
          }
          
          .file-info p {
            margin: 5px 0;
          }
          
          .upload-actions {
            display: flex;
            gap: 10px;
          }
          
          .upload-button {
            background-color: #ff9800;
          }
          
          .save-button {
            background-color: #4caf50;
          }
          
          .error-message {
            padding: 10px;
            background-color: #ffebee;
            border-left: 4px solid #f44336;
            margin-top: 15px;
          }
          
          .success-message {
            padding: 10px;
            background-color: #e8f5e9;
            border-left: 4px solid #4caf50;
            margin-top: 15px;
          }
          
          .preview-section {
            margin-bottom: 20px;
          }
          
          .table-container {
            overflow-x: auto;
          }
          
          .preview-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .preview-table th,
          .preview-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          .preview-table th {
            background-color: #f5f5f5;
          }
          
          .preview-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          .instructions-card h3 {
            margin-bottom: 10px;
          }
          
          .instructions-card ol {
            padding-left: 20px;
          }
          
          .instructions-card li {
            margin-bottom: 8px;
          }
          
          @media (min-width: 768px) {
            .upload-container {
              flex-direction: row;
              justify-content: space-between;
              align-items: flex-start;
            }
            
            .file-input-section {
              flex: 1;
              margin-right: 20px;
              margin-bottom: 0;
            }
            
            .upload-actions {
              flex-direction: column;
            }
          }
        `}
      </style>
    </div>
  );
};

// Форматирование размера файла
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Байт';
  const k = 1024;
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default SSIMUploadPage;
