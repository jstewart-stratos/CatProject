import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface UploadResult {
  message: string;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export default function CSVUpload() {
  const [activeTab, setActiveTab] = useState("clients");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const endpoint = activeTab === 'clients' ? '/api/upload/clients-csv' : '/api/upload/accounts-csv';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data: UploadResult) => {
      setUploadResult(data);
      setUploading(false);
      toast({
        title: "Upload Completed",
        description: data.message,
        variant: data.errorCount > 0 ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      setUploading(false);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);
    uploadMutation.mutate(file);
  };

  const downloadTemplate = async (type: 'clients' | 'accounts') => {
    try {
      const endpoint = type === 'clients' ? '/api/templates/clients-csv' : '/api/templates/accounts-csv';
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: `${type} template downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:ml-64 pt-16 lg:pt-0">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CSV Bulk Upload</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload CSV files to import clients and accounts in bulk
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Client CSV Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>1. Download Template</Label>
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('clients')}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Clients Template
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>2. Upload Your CSV</Label>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                      />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
                          <Upload className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The CSV file must include columns: first_name, last_name, email_address (required). 
                    Download the template for the complete format.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Account CSV Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>1. Download Template</Label>
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('accounts')}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Accounts Template
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>2. Upload Your CSV</Label>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                      />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
                          <Upload className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Account CSV requires client identification (client_email or client_ssn_or_tin) and 
                    basic account info (account_type, program_type). Download template for complete format.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {uploading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label>Uploading...</Label>
                <Progress value={undefined} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {uploadResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {uploadResult.errorCount === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{uploadResult.successCount}</div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{uploadResult.errorCount}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Label>Errors:</Label>
                  <div className="max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/20 p-3 rounded border">
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 mb-1">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}