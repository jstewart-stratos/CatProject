import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import ClientModal from "@/components/modals/client-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

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

  const { data: clientsData, isLoading: clientsLoading, refetch } = useQuery({
    queryKey: ["/api/clients", { search }],
    enabled: isAuthenticated,
  });

  const openModal = (client?: any) => {
    setSelectedClient(client || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedClient(null);
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    refetch();
    closeModal();
    toast({
      title: "Success!",
      description: `Client has been ${selectedClient ? 'updated' : 'created'} successfully.`,
    });
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView="clients" />
      <div className="ml-64">
        <TopBar 
          title="Client Management" 
          subtitle="Manage and organize client information"
        />
        
        <div className="p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Client Management</CardTitle>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search clients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
                <Button onClick={() => openModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Accounts</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading clients...
                        </TableCell>
                      </TableRow>
                    ) : clientsData?.clients?.length > 0 ? (
                      clientsData.clients.map((client: any) => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-slate-400 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {client.firstName?.[0]}{client.lastName?.[0]}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-800">
                                  {client.firstName} {client.lastName}
                                </div>
                                <div className="text-sm text-slate-500">
                                  CLI-{client.id}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {client.emailAddress || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {client.clientType || 'Individual'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">0</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openModal(client)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No clients found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {clientsData?.total > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    Showing 1 to {Math.min(50, clientsData.total)} of {clientsData.total} results
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">Previous</Button>
                    <Button variant="outline" size="sm">1</Button>
                    <Button variant="outline" size="sm">2</Button>
                    <Button variant="outline" size="sm">3</Button>
                    <Button variant="outline" size="sm">Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <ClientModal
        isOpen={isModalOpen}
        onClose={closeModal}
        client={selectedClient}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
