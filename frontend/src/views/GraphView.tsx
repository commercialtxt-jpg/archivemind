import { useNavigate } from 'react-router-dom';
import KnowledgeGraph from '../components/graph/KnowledgeGraph';

export default function GraphView() {
  const navigate = useNavigate();

  return (
    <KnowledgeGraph onClose={() => navigate('/journal')} />
  );
}
