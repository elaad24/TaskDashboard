import { Navigate } from 'react-router-dom';
import { getLastWorkView, workViewToPath } from '@/lib/workView';

export const WorkRedirect = () => <Navigate to={workViewToPath[getLastWorkView()]} replace />;
