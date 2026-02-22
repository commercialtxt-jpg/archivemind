import NoteList from '../components/notes/NoteList';
import NoteEditor from '../components/notes/NoteEditor';
import EntityPanel from '../components/entity/EntityPanel';

export default function JournalView() {
  return (
    <div className="flex h-full">
      <NoteList />
      <div className="flex-1 min-w-0">
        <NoteEditor />
      </div>
      <EntityPanel />
    </div>
  );
}
