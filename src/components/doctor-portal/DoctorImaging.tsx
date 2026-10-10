import React from 'react';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorImaging: React.FC = () => (
  <DoctorUnavailable
    title="Imaging workflow unavailable"
    message="No verified PACS or imaging integration is connected for this Doctor Portal session."
    scope="Imaging orders, reports, and viewers are blocked; no local study is created."
  />
);
