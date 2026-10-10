import React from 'react';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorAppointments: React.FC<{ calendarMode?: boolean }> = ({ calendarMode = false }) => (
  <DoctorUnavailable
    title={calendarMode ? 'Schedule unavailable' : 'Appointments unavailable'}
    message="Appointment and calendar data are not connected to an authorized scheduling service for this Doctor Portal session."
    scope="No appointments, patient identifiers, or booking statuses are fabricated or stored locally."
  />
);
