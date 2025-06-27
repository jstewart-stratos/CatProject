import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import ClientModal from "@/components/modals/client-modal";
import { ClientDetailsModal } from "@/components/modals/client-details-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [clientToView, setClientToView] = useState<any>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set());

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

  // Fetch user data to check role
  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  // Fetch groups for filter dropdown (only for transitions specialists)
  const { data: groupsData } = useQuery({
    queryKey: ["/api/groups"],
    enabled: isAuthenticated && userData?.role === 'transition_specialist',
  });

  const { data: clientsData, isLoading: clientsLoading, refetch } = useQuery({
    queryKey: ["/api/clients", { search, groupId: selectedGroupId !== "all" ? selectedGroupId : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedGroupId !== "all") params.set('groupId', selectedGroupId);
      const queryString = params.toString();
      const url = `/api/clients${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });



  // Fetch draft onboardings
  const { data: draftsData, isLoading: draftsLoading, refetch: refetchDrafts } = useQuery({
    queryKey: ["/api/draft-onboarding"],
    enabled: isAuthenticated,
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      await apiRequest("DELETE", `/api/draft-onboarding/${draftId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-onboarding"] });
      toast({
        title: "Draft Deleted",
        description: "The draft has been successfully deleted.",
      });
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
        title: "Error",
        description: "Failed to delete draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete clients mutation
  const bulkDeleteClientsMutation = useMutation({
    mutationFn: async (clientIds: number[]) => {
      await apiRequest("DELETE", "/api/clients/bulk", { clientIds });
    },
    onSuccess: () => {
      refetch();
      setSelectedClientIds(new Set());
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedClientIds.size} client(s)`,
      });
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
        title: "Error",
        description: "Failed to delete clients. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for bulk selection
  const handleSelectClient = (clientId: number, checked: boolean) => {
    const newSelectedIds = new Set(selectedClientIds);
    if (checked) {
      newSelectedIds.add(clientId);
    } else {
      newSelectedIds.delete(clientId);
    }
    setSelectedClientIds(newSelectedIds);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allClientIds = new Set(clientsData?.clients?.map((client: any) => client.id) || []);
      setSelectedClientIds(allClientIds);
    } else {
      setSelectedClientIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedClientIds.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedClientIds.size} client(s)? This action cannot be undone.`)) {
      bulkDeleteClientsMutation.mutate(Array.from(selectedClientIds));
    }
  };

  // Calculate completion percentage for drafts
  const calculateCompletionPercentage = (formData: any) => {
    const requiredFields = [
      'clientType', 'ssn', 'firstName', 'lastName', 'citizenship', 'dateOfBirth',
      'emailAddress', 'legalAddress1', 'city', 'state', 'zipCode',
      'employmentStatus', 'annualIncome', 'netWorth', 'liquidNetWorth',
      'trustedContactFirstName', 'trustedContactLastName', 'trustedContactRelationship',
      'hasInvestmentExperience', 'hasOtherInvestments'
    ];
    
    const filledRequiredFields = requiredFields.filter(field => 
      formData[field] && formData[field] !== ""
    ).length;
    
    return Math.round((filledRequiredFields / requiredFields.length) * 100);
  };

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
    refetchDrafts();
    closeModal();
    toast({
      title: "Success!",
      description: `Client has been ${selectedClient ? 'updated' : 'created'} successfully.`,
    });
  };

  const openDetailsModal = (client: any) => {
    navigate(`/clients/${client.id}`);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setClientToView(null);
  };

  const handleEditClient = (client: any) => {
    setSelectedClient(client);
    setIsModalOpen(true);
    setIsDetailsModalOpen(false);
  };

  const handleAddAccount = (clientId: number) => {
    window.location.href = `/account-form?clientId=${clientId}`;
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
                {selectedClientIds.size > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteClientsMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedClientIds.size})
                  </Button>
                )}
                <div className="flex items-center space-x-3">
                  {/* Group filter for transitions specialists */}
                  {userData?.role === 'transition_specialist' && groupsData && (
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-slate-500" />
                      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by group..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Groups</SelectItem>
                          {groupsData.map((group: any) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search clients..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                </div>
                <Button onClick={() => window.location.href = '/client-onboarding-full'}>
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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedClientIds.size > 0 && selectedClientIds.size === (clientsData?.clients?.length || 0)}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all clients"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(clientsLoading || draftsLoading) ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading clients...
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {/* Show completed clients */}
                        {clientsData?.clients?.map((client: any) => (
                          <TableRow key={`client-${client.id}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedClientIds.has(client.id)}
                                onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                                aria-label={`Select client ${client.firstName} ${client.lastName}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
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
                            <TableCell>
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                                Completed
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => openDetailsModal(client)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleAddAccount(client.id)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Show draft onboardings */}
                        {draftsData?.map((draft: any) => {
                          const completionPercentage = calculateCompletionPercentage(draft.formData || {});
                          const formData = draft.formData || {};
                          return (
                            <TableRow key={`draft-${draft.id}`} className="bg-amber-50">
                              <TableCell>
                                {/* Drafts cannot be bulk deleted, so show empty cell */}
                                <div className="w-6"></div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      {formData.firstName?.[0] || "?"}{formData.lastName?.[0] || "?"}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-slate-800">
                                      {formData.firstName && formData.lastName 
                                        ? `${formData.firstName} ${formData.lastName}`
                                        : draft.title || `Draft ${draft.id}`
                                      }
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      DRAFT-{draft.id}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {formData.emailAddress || "Not provided"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {formData.clientType || "Individual"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                                    In Progress
                                  </Badge>
                                  <div className="flex items-center gap-1">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-amber-600 h-2 rounded-full" 
                                        style={{ width: `${completionPercentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-slate-500">{completionPercentage}%</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {new Date(draft.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => window.location.href = `/client-onboarding-full?draftId=${draft.id}`}
                                    className="bg-amber-600 hover:bg-amber-700"
                                  >
                                    Continue
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => deleteDraftMutation.mutate(draft.id)}
                                    disabled={deleteDraftMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {/* Show empty state if no data */}
                        {(!clientsData?.clients?.length && !draftsData?.length) && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              No clients or drafts found
                            </TableCell>
                          </TableRow>
                        )}
                      </>
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
      
      <ClientDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        client={clientToView}
        onEdit={handleEditClient}
        onAddAccount={handleAddAccount}
      />
    </div>
  );
}
