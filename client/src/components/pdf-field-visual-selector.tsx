import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

interface PDFFieldVisualSelectorProps {
  templateId: number;
  pdfUrl: string;
  onFieldSelect: (fieldName: string, coordinates: { x: number; y: number }) => void;
  onClose: () => void;
  selectedFields: string[];
}

interface FieldMarker {
  name: string;
  x: number;
  y: number;
  id: string;
}

export default function PDFFieldVisualSelector({
  templateId,
  pdfUrl,
  onFieldSelect,
  onClose,
  selectedFields
}: PDFFieldVisualSelectorProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fieldMarkers, setFieldMarkers] = useState<FieldMarker[]>([]);
  const [nextFieldIndex, setNextFieldIndex] = useState(1);
  const [selectedField, setSelectedField] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set PDF.js worker
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }, []);

  // Load PDF when component mounts
  useEffect(() => {
    loadPDF();
  }, [pdfUrl]);

  const loadPDF = async () => {
    try {
      setIsLoading(true);
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      await renderPage(pdf, 1);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setIsLoading(false);
    }
  };

  const renderPage = async (pdf: any, pageNumber: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const page = await pdf.getPage(pageNumber);
    const context = canvas.getContext('2d');
    
    const viewport = page.getViewport({ scale: zoom });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
  };

  // Re-render when zoom or page changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  }, [pdfDoc, currentPage, zoom]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedField) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    // Create new field marker
    const newMarker: FieldMarker = {
      name: selectedField,
      x: x,
      y: y,
      id: `field_${Date.now()}`
    };

    setFieldMarkers(prev => [...prev, newMarker]);
    onFieldSelect(selectedField, { x, y });
    setSelectedField("");
  };

  const removeFieldMarker = (markerId: string) => {
    setFieldMarkers(prev => prev.filter(marker => marker.id !== markerId));
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const generateFieldName = () => {
    const fieldName = `Field_${nextFieldIndex}`;
    setNextFieldIndex(prev => prev + 1);
    setSelectedField(fieldName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Visual PDF Field Selector
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click on PDF fields to map them to data sources
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* PDF Viewer */}
          <div className="flex-1 flex flex-col">
            {/* Controls */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
              <Button size="sm" variant="outline" onClick={zoomOut} disabled={isLoading}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              <Button size="sm" variant="outline" onClick={zoomIn} disabled={isLoading}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              {/* Page Navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2 ml-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">Page {currentPage} of {totalPages}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              )}
              
              <div className="ml-auto">
                {selectedField ? (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedField("")}>
                    Ready to place: {selectedField} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : (
                  <Button size="sm" onClick={generateFieldName} disabled={isLoading}>
                    Add New Field
                  </Button>
                )}
              </div>
            </div>

            {/* PDF Canvas */}
            <div 
              ref={containerRef}
              className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 relative"
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 min-h-full">
                  <div 
                    className="relative border border-gray-300 dark:border-gray-600 bg-white shadow-lg"
                    style={{ 
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center'
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="cursor-crosshair block"
                      onClick={handleCanvasClick}
                    />
                    
                    {/* Field Markers */}
                    {fieldMarkers.map((marker) => (
                      <div
                        key={marker.id}
                        className="absolute bg-blue-500 bg-opacity-75 text-white text-xs px-2 py-1 rounded cursor-pointer hover:bg-opacity-90 transition-all"
                        style={{
                          left: marker.x * zoom,
                          top: marker.y * zoom,
                          transform: 'translate(-50%, -50%)',
                          fontSize: `${12 / zoom}px`,
                          minWidth: `${80 / zoom}px`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFieldMarker(marker.id);
                        }}
                      >
                        {marker.name}
                        <X className="h-3 w-3 inline ml-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Field List Sidebar */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Card className="h-full rounded-none border-0">
              <CardHeader>
                <CardTitle className="text-lg">Mapped Fields</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="p-4 space-y-2">
                    {fieldMarkers.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                        No fields mapped yet.<br />
                        Click "Add New Field" and then click on the PDF to place field markers.
                      </p>
                    ) : (
                      fieldMarkers.map((marker, index) => (
                        <div
                          key={marker.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border"
                        >
                          <div>
                            <p className="font-medium text-sm">{marker.name}</p>
                            <p className="text-xs text-gray-500">
                              Position: ({Math.round(marker.x)}, {Math.round(marker.y)})
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFieldMarker(marker.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {fieldMarkers.length} field(s) mapped
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              Done ({fieldMarkers.length} fields)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}