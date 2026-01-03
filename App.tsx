
import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument } from './types.ts';
import * as Storage from './services/storage.ts';
import * as PDFFactory from './services/pdfFactory.ts';

type ViewMode = 'library' | 'create';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [darkMode, setDarkMode] = useState(false);
  
  // Creator Form State
  const [creatorTitle, setCreatorTitle] = useState('');
  const [creatorContent, setCreatorContent] = useState('');
  const [creatorCover, setCreatorCover] = useState<string | null>(null);

  // Upload Form State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCover, setUploadCover] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initial Load
  useEffect(() => {
    loadDocuments();
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  // Dark Mode Side Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await Storage.getDocuments();
      setDocuments(docs.sort((a, b) => b.addedAt - a.addedAt));
    } catch (error) {
      console.error("Failed to load documents", error);
    }
  }, []);

  // --- Handlers ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      // Only set name if not already typed
      if (!uploadName) {
        setUploadName(file.name.replace('.pdf', ''));
      }
    }
  };

  const processCoverImage = (file: File, callback: (result: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCoverImage(e.target.files[0], setUploadCover);
    }
  };

  const handleCreatorCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCoverImage(e.target.files[0], setCreatorCover);
    }
  };

  const confirmUpload = async () => {
    if (!uploadFile) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await uploadFile.arrayBuffer();
      const newDoc: PDFDocument = {
        id: crypto.randomUUID(),
        name: uploadName || uploadFile.name.replace('.pdf', ''),
        size: uploadFile.size,
        type: uploadFile.type,
        data: arrayBuffer,
        coverImage: uploadCover || undefined,
        addedAt: Date.now(),
      };
      await Storage.saveDocument(newDoc);
      await loadDocuments();
      resetUploadForm();
    } catch (error) {
      alert("Erro ao salvar arquivo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadCover(null);
    setUploadName('');
    setShowUploadModal(false);
  };

  const handleCreatePDF = async () => {
    if (!creatorTitle.trim() || !creatorContent.trim()) {
      alert("Por favor, adicione um título e conteúdo.");
      return;
    }

    try {
      const pdfBuffer = PDFFactory.createPDF(creatorTitle, creatorContent);
      
      const newDoc: PDFDocument = {
        id: crypto.randomUUID(),
        name: creatorTitle,
        size: pdfBuffer.byteLength,
        type: 'application/pdf',
        data: pdfBuffer,
        coverImage: creatorCover || undefined,
        addedAt: Date.now(),
        description: 'Gerado internamente'
      };

      await Storage.saveDocument(newDoc);
      await loadDocuments();
      
      // Clear form
      setCreatorTitle('');
      setCreatorContent('');
      setCreatorCover(null);
      
      // Go back to library
      setViewMode('library');
      alert("PDF criado com sucesso!");

    } catch (e) {
      console.error(e);
      alert("Erro ao criar PDF. Verifique se o texto não contém caracteres especiais não suportados.");
    }
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este PDF?")) {
      await Storage.deleteDocument(id);
      loadDocuments();
    }
  };

  const openDoc = (doc: PDFDocument) => {
    // Create a Blob from the stored ArrayBuffer
    const blob = new Blob([doc.data], { type: 'application/pdf' });
    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);
    
    // Open the PDF in a new tab. 
    // This forces the browser or device to use its native PDF viewer/handler.
    const newWindow = window.open(url, '_blank');
    
    // Fallback if popup blocker prevents opening
    if (!newWindow) {
        alert("Por favor, permita popups para este site para visualizar o PDF.");
    }

    // Note: In a production app with heavy usage, we should eventually revokeObjectURL 
    // to free memory, but revoking immediately might break the new tab on some browsers.
    // We set a timeout to clean it up after a minute.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // --- Renders ---

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${darkMode ? 'bg-dark-bg text-dark-text' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Header */}
      <nav className={`sticky top-0 z-50 border-b px-6 py-4 flex items-center justify-between backdrop-blur-md ${darkMode ? 'bg-dark-card/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewMode('library')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <i className="fas fa-book-open"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Estante<span className="text-indigo-500">PDF</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('create')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${viewMode === 'create' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <i className="fas fa-plus"></i> <span className="hidden sm:inline">Criar PDF</span>
          </button>
          
          <button 
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-md transition-all flex items-center gap-2"
          >
            <i className="fas fa-upload"></i> <span className="hidden sm:inline">Upload</span>
          </button>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-80px)] pb-24">
        
        {/* Library View */}
        {viewMode === 'library' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <i className="fas fa-layer-group text-indigo-500"></i>
              Sua Biblioteca
            </h2>
            
            {documents.length === 0 ? (
              <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${darkMode ? 'border-gray-700 bg-dark-card' : 'border-gray-200 bg-white'}`}>
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <i className="fas fa-folder-open text-3xl"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">Biblioteca Vazia</h3>
                <p className="text-gray-500 mb-6">Faça upload de um PDF existente ou crie um novo.</p>
                <button onClick={() => setViewMode('create')} className="text-indigo-500 font-medium hover:underline">
                  Começar agora &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {documents.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => openDoc(doc)}
                    className={`group relative rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer border ${darkMode ? 'bg-dark-card border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}
                  >
                    {/* Cover Image Area */}
                    <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
                      {doc.coverImage ? (
                        <img src={doc.coverImage} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center opacity-30">
                          <i className="fas fa-file-pdf text-5xl mb-2"></i>
                        </div>
                      )}
                      
                      {/* Hover Overlay - Icon changed to External Link to indicate opening new tab */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <div className="bg-white/90 text-gray-900 rounded-full px-3 py-1 text-xs font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                             <i className="fas fa-external-link-alt mr-1"></i> Abrir
                        </div>
                        <button 
                          onClick={(e) => deleteDoc(doc.id, e)}
                          className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg transform scale-75 group-hover:scale-100 transition-all"
                          title="Excluir"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </div>

                    {/* Info Area */}
                    <div className="p-4">
                      <h3 className="font-bold text-sm truncate mb-1" title={doc.name}>{doc.name}</h3>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400">
                        <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>{new Date(doc.addedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create View */}
        {viewMode === 'create' && (
          <div className="max-w-4xl mx-auto animate-fade-in pb-12">
             <div className="mb-6 flex items-center justify-between">
              <button 
                onClick={() => setViewMode('library')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-2"
              >
                <i className="fas fa-times"></i> Cancelar
              </button>
              <h2 className="text-2xl font-bold">Novo Documento PDF</h2>
              <button 
                onClick={handleCreatePDF}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all"
              >
                <i className="fas fa-save"></i> Salvar PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cover Column */}
              <div className="md:col-span-1">
                 <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? 'bg-dark-card border-gray-700' : 'bg-white border-gray-200'}`}>
                    <label className="block text-sm font-medium mb-4 opacity-70">Capa do Documento</label>
                    <div className="relative group">
                       <input 
                         type="file" 
                         id="creator-cover"
                         accept="image/*"
                         onChange={handleCreatorCoverSelect}
                         className="hidden" 
                       />
                       <label 
                         htmlFor="creator-cover"
                         className={`block w-full aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all ${
                           creatorCover 
                             ? 'border-transparent' 
                             : 'hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-gray-300 dark:border-gray-600'
                         }`}
                       >
                          {creatorCover ? (
                            <div className="relative w-full h-full">
                               <img src={creatorCover} alt="Cover Preview" className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-white text-sm font-medium"><i className="fas fa-pen mr-2"></i>Alterar</span>
                               </div>
                            </div>
                          ) : (
                            <div className="text-center p-4 text-gray-400">
                               <i className="fas fa-image text-3xl mb-2"></i>
                               <p className="text-xs">Clique para adicionar capa</p>
                            </div>
                          )}
                       </label>
                    </div>
                 </div>
              </div>

              {/* Editor Column */}
              <div className="md:col-span-2">
                <div className={`p-8 rounded-2xl shadow-sm border h-full ${darkMode ? 'bg-dark-card border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2 opacity-70">Título do Documento</label>
                    <input 
                      type="text" 
                      value={creatorTitle}
                      onChange={(e) => setCreatorTitle(e.target.value)}
                      placeholder="Ex: Minhas Anotações..."
                      className={`w-full text-2xl font-bold p-4 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${darkMode ? 'bg-dark-bg border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2 opacity-70">Conteúdo</label>
                    <textarea 
                      value={creatorContent}
                      onChange={(e) => setCreatorContent(e.target.value)}
                      placeholder="Escreva seu conteúdo aqui..."
                      className={`w-full h-96 p-6 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all leading-relaxed ${darkMode ? 'bg-dark-bg border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    ></textarea>
                  </div>

                  <button 
                    onClick={handleCreatePDF}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 transition-all"
                  >
                    <i className="fas fa-save mr-2"></i> Salvar PDF na Biblioteca
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Action Button for Save on Mobile/Scroll */}
            <button
               onClick={handleCreatePDF}
               className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center text-xl z-40 hover:scale-110 transition-transform md:hidden"
            >
              <i className="fas fa-save"></i>
            </button>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in ${darkMode ? 'bg-dark-card text-white' : 'bg-white text-gray-900'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold">Adicionar PDF</h3>
              <button onClick={resetUploadForm} className="text-gray-400 hover:text-red-500 transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Arquivo PDF</label>
                <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors relative ${uploadFile ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                   <input type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" id="pdf-upload" />
                   <label htmlFor="pdf-upload" className="cursor-pointer block w-full h-full">
                      {uploadFile ? (
                        <div className="text-indigo-600 dark:text-indigo-400 font-medium truncate">
                          <i className="fas fa-check-circle mr-2"></i>
                          {uploadFile.name}
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <i className="fas fa-cloud-upload-alt text-2xl mb-2"></i>
                          <p>Clique para escolher o PDF</p>
                        </div>
                      )}
                   </label>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Nome de Exibição</label>
                <input 
                  type="text" 
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Nome do documento"
                  className={`w-full p-3 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-dark-bg border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Cover Image Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Capa do Documento</label>
                <input type="file" accept="image/*" onChange={handleUploadCoverSelect} className="hidden" id="upload-cover-input" />
                <label 
                  htmlFor="upload-cover-input"
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${darkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className={`w-12 h-16 rounded overflow-hidden flex-shrink-0 flex items-center justify-center relative ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    {uploadCover ? (
                      <img src={uploadCover} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-image text-gray-400"></i>
                    )}
                  </div>
                  <div className="flex-1">
                     <p className="text-sm font-medium">{uploadCover ? 'Imagem selecionada' : 'Selecionar imagem (PNG/JPG)'}</p>
                     <p className="text-xs text-gray-500">{uploadCover ? 'Clique para trocar' : 'Opcional'}</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 pt-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-card shrink-0">
              <button 
                onClick={confirmUpload}
                disabled={!uploadFile || isProcessing}
                className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${uploadFile && !isProcessing ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
              >
                {isProcessing ? 'Processando...' : 'Salvar na Biblioteca'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
