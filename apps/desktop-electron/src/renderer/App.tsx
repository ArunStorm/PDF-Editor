import Viewer from '@pdf-editor/pdf-ui';

export default function App() {
  return <Viewer
    openFile={() => window.pdfEditor.openFile()}
    saveFile={async (bytes) => { await window.pdfEditor.saveFile(bytes); }}
    downloadFile={async (bytes) => { await window.pdfEditor.saveFile(bytes); }}
  />;
}
