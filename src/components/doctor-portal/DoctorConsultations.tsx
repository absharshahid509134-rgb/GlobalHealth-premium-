import React from 'react';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorConsultations: React.FC<{ onNavigate?: (v: any) => void }> = () => (
  <DoctorUnavailable
    title="Consultation notes unavailable"
    message="Consultation persistence is not connected to the authorized clinical notes service."
    scope="Drafts, assessments, plans, and signed notes cannot be stored or completed in the browser."
  />
);
