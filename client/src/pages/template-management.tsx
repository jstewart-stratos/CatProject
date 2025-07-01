import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, FileText, Trash2, Settings, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { PDFFieldSelector } from "@/components/pdf-field-selector";

interface Template {
  id: number;
  name: string;
  businessLine: string;
  fileName: string;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FieldMapping {
  id: number;
  templateId: number;
  pdfFieldName: string;
  dataSource: string;
  fieldType: string;
  defaultValue?: string;
  isRequired: boolean;
}

export default function TemplateManagement() {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/pdf-templates"],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/pdf-templates/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-templates"] });
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      toast({
        title: "Success",
        description: "PDF template uploaded and analyzed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pdf-templates/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append("template", uploadFile);

    uploadMutation.mutate(formData);
  };

  if (selectedTemplate) {
    return (
      <>
        <Sidebar />
        <div className="lg:ml-64">
          <TopBar title="Template Management" subtitle="Configure PDF template field mappings" />
          <main className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => setSelectedTemplate(null)}
                size="sm"
              >
                ← Back to Templates
              </Button>
              <h2 className="text-xl font-semibold">Configure: {selectedTemplate.name}</h2>
            </div>
            <PDFFieldSelector
              templateId={selectedTemplate.id}
              templateName={selectedTemplate.name}
            />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="lg:ml-64">
        <TopBar title="Template Management" subtitle="Upload and manage PDF templates for client agreements" />
        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">PDF Template Management</h1>
              <p className="text-muted-foreground mt-1">
                Upload PDF templates and configure field mappings for automated document generation
              </p>
            </div>
            
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload PDF Template</DialogTitle>
                  <DialogDescription>
                    Upload a PDF template that will be analyzed for form fields
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-file">PDF Template File</Label>
                    <Input
                      id="template-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload}
                      disabled={!uploadFile || uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>PDF Templates</CardTitle>
              <CardDescription>
                Manage your PDF templates and their field mappings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates found. Upload your first PDF template to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Business Line</TableHead>
                      <TableHead>Field Count</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-gray-500" />
                            {template.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.businessLine}</Badge>
                        </TableCell>
                        <TableCell>{template.fieldCount} fields</TableCell>
                        <TableCell>
                          {new Date(template.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Configure Fields
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteMutation.mutate(template.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}