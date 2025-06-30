import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/sidebar';
import TopBar from '@/components/top-bar';
import { Plus, FileText, Settings, Eye, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DocumentTemplate {
  id: number;
  name: string;
  description?: string;
  templateType: string;
  fields: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DocumentField {
  name: string;
  type: "text" | "date" | "checkbox" | "select";
  dataSource: string;
  defaultValue?: string;
  required?: boolean;
  description?: string;
}

export default function DocumentTemplates() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for document templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/document-templates'],
    retry: false,
  });

  // Query for clients (for document generation)
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    retry: false,
  });

  // Query for accounts based on selected client
  const { data: accounts } = useQuery({
    queryKey: ['/api/accounts/by-client', selectedClientId],
    enabled: !!selectedClientId,
    retry: false,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (templateData: any) => apiRequest('/api/document-templates', {
      method: 'POST',
      body: templateData,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Template Created",
        description: "Document template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Generate document mutation
  const generateDocumentMutation = useMutation({
    mutationFn: (data: { templateId: number; clientId: number; accountId?: number }) => 
      apiRequest('/api/generate-document', {
        method: 'POST',
        body: data,
      }),
    onSuccess: (response: any) => {
      setIsGenerateDialogOpen(false);
      setSelectedClientId('');
      setSelectedAccountId('');
      toast({
        title: "Document Generated",
        description: "Document has been generated successfully.",
      });
      
      // Download the generated document
      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to generate document",
        variant: "destructive",
      });
    },
  });

  const handleCreateTemplate = (formData: FormData) => {
    const templateData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      templateType: formData.get('templateType') as string,
      filePath: `/templates/${(formData.get('templateType') as string).toLowerCase()}.html`, // Auto-generate file path
      fields: [], // Start with empty fields, can be edited later
    };

    createTemplateMutation.mutate(templateData);
  };

  const viewTemplateFields = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const openGenerateDialog = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsGenerateDialogOpen(true);
  };

  const handleGenerateDocument = () => {
    if (!selectedTemplate || !selectedClientId) return;
    
    generateDocumentMutation.mutate({
      templateId: selectedTemplate.id,
      clientId: parseInt(selectedClientId),
      accountId: selectedAccountId ? parseInt(selectedAccountId) : undefined,
    });
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'client_agreement': return 'bg-blue-100 text-blue-800';
      case 'account_opening': return 'bg-green-100 text-green-800';
      case 'advisory_agreement': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64">
        <TopBar title="Document Templates" subtitle="Manage document templates and field mappings" />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
              <p className="text-gray-600">Create and manage fillable document templates for client agreements</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Document Template</DialogTitle>
                  <DialogDescription>
                    Create a new document template with field mappings for client data.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateTemplate(formData);
                }}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="e.g., Client Agreement"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Brief description of the template"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="templateType">Template Type</Label>
                      <Select name="templateType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client_agreement">Client Agreement</SelectItem>
                          <SelectItem value="account_opening">Account Opening</SelectItem>
                          <SelectItem value="advisory_agreement">Advisory Agreement</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createTemplateMutation.isPending}>
                      {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template: DocumentTemplate) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <Badge className={getTemplateTypeColor(template.templateType)}>
                        {template.templateType.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {Array.isArray(template.fields) ? template.fields.length : 0} fields
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewTemplateFields(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openGenerateDialog(template)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Yet</h3>
                <p className="text-gray-500 text-center mb-4">
                  Create your first document template to start generating fillable documents.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          )}

          {/* View Template Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{selectedTemplate?.name}</DialogTitle>
                <DialogDescription>
                  Field mappings for this document template
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                {selectedTemplate?.fields && Array.isArray(selectedTemplate.fields) && selectedTemplate.fields.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTemplate.fields.map((field: DocumentField, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{field.name}</h4>
                          <Badge variant="outline">{field.type}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><strong>Data Source:</strong> {field.dataSource}</div>
                          {field.description && <div><strong>Description:</strong> {field.description}</div>}
                          {field.defaultValue && <div><strong>Default:</strong> {field.defaultValue}</div>}
                          {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No fields configured for this template
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Generate Document Dialog */}
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Generate Document</DialogTitle>
                <DialogDescription>
                  Generate a document using the "{selectedTemplate?.name}" template with client data.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="client-select">Select Client *</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients && clients.length > 0 ? (
                        clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.firstName} {client.lastName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-clients" disabled>
                          No clients available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClientId && (
                  <div>
                    <Label htmlFor="account-select">Select Account (Optional)</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific account</SelectItem>
                        {accounts && accounts.length > 0 ? (
                          accounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.accountType} - {account.programType}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-accounts" disabled>
                            No accounts for this client
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsGenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateDocument}
                  disabled={!selectedClientId || generateDocumentMutation.isPending}
                >
                  {generateDocumentMutation.isPending ? 'Generating...' : 'Generate Document'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}