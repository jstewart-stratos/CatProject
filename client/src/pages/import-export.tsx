import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, CloudUpload, FileText } from "lucide-react";

export default function ImportExport() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [importType, setImportType] = useState("");
  const [exportType, setExportType] = useState("");
  const [validateData, setValidateData] = useState(true);
  const [includeLocked, setIncludeLocked] = useState(false);
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: uploadsData, isLoading: uploadsLoading } = useQuery({
    queryKey: ["/api/uploads"],
    enabled: isAuthenticated,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload Started",
        description: "Your file is being processed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!importType) {
      toast({
        title: "Please select import type",
        description: "Choose an import type before uploading a file.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', importType);
    formData.append('validateData', validateData.toString());

    uploadMutation.mutate(formData);
  };

  const handleExport = () => {
    if (!exportType) {
      toast({
        title: "Please select export type",
        description: "Choose an export type to generate the report.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Export Started",
      description: "Your export is being generated.",
    });
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView="import-export" />
      <div className="ml-64">
        <TopBar 
          title="Import/Export" 
          subtitle="Bulk data operations and reporting"
        />
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Import Section */}
            <Card>
              <CardHeader>
                <CardTitle>Import Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Import Type</label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select import type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Client Data (CSV)</SelectItem>
                      <SelectItem value="accounts">Account Data (CSV)</SelectItem>
                      <SelectItem value="combined">Combined Data (Excel)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <CloudUpload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">Drag and drop your file here, or</p>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">browse files</span>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-2">Supports CSV, XLSX files up to 10MB</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="validate-data"
                    checked={validateData}
                    onCheckedChange={setValidateData}
                  />
                  <label htmlFor="validate-data" className="text-sm text-slate-600">
                    Validate data before import
                  </label>
                </div>
                
                <Button 
                  className="w-full" 
                  disabled={!importType || uploadMutation.isPending}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadMutation.isPending ? 'Uploading...' : 'Start Import'}
                </Button>
              </CardContent>
            </Card>
            
            {/* Export Section */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Export Type</label>
                  <Select value={exportType} onValueChange={setExportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select export type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">All Clients (CSV)</SelectItem>
                      <SelectItem value="accounts">All Accounts (CSV)</SelectItem>
                      <SelectItem value="combined">Combined Report (Excel)</SelectItem>
                      <SelectItem value="audit">Audit Log (PDF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="date" />
                    <Input type="date" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Filters</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-locked"
                        checked={includeLocked}
                        onCheckedChange={setIncludeLocked}
                      />
                      <label htmlFor="include-locked" className="text-sm text-slate-600">
                        Include locked accounts
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-sensitive"
                        checked={includeSensitive}
                        onCheckedChange={setIncludeSensitive}
                      />
                      <label htmlFor="include-sensitive" className="text-sm text-slate-600">
                        Include sensitive data
                      </label>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={handleExport}
                  disabled={!exportType}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate Export
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Operations */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadsLoading ? (
                  <p className="text-slate-500">Loading operations...</p>
                ) : uploadsData?.uploads?.length > 0 ? (
                  uploadsData.uploads.map((upload: any) => (
                    <div key={upload.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{upload.originalName}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(upload.createdAt).toLocaleString()} • {upload.recordsProcessed || 0} records
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={upload.status === 'completed' ? 'default' : upload.status === 'error' ? 'destructive' : 'secondary'}>
                          {upload.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No recent operations</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
