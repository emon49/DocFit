import React from 'react';
import ReactDOM from 'react-dom/client';
import { DoctorScheduleApp } from '../pages/DoctorScheduleApp';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <DoctorScheduleApp />
    </React.StrictMode>
  );
}
