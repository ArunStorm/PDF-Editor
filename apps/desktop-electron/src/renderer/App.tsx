import Viewer from '@pdf-editor/pdf-ui';
export default function App() { return <Viewer openFile={() => window.pdfEditor.openFile()} saveFile={(bytes) => window.pdfEditor.saveFile(bytes)} />; }
