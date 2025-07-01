import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Home, Users, Eye, Edit, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { useToast } from "@/hooks/use-toast";
import type { Household, Client, Account } from "@shared/schema";

const householdSchema = z.object({
  name: z.string().min(1, "Household name is required"),
  primaryContactClientId: z.number().optional(),
  description: z.string().optional(),
});

type HouseholdFormData = z.infer<typeof householdSchema>;

export default function HouseholdsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch households
  const { data: householdsData, isLoading: isLoadingHouseholds } = useQuery({
    queryKey: ["/api/households"],
  });

  // Fetch clients for primary contact selection
  const { data: clientsData } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Fetch household details (clients and accounts)
  const { data: householdClients } = useQuery({
    queryKey: [`/api/households/${selectedHousehold?.id}/clients`],
    enabled: !!selectedHousehold && isDetailsDialogOpen,
  });

  const { data: householdAccounts } = useQuery({
    queryKey: [`/api/households/${selectedHousehold?.id}/accounts`],
    enabled: !!selectedHousehold && isDetailsDialogOpen,
  });

  // Create household mutation
  const createHouseholdMutation = useMutation({
    mutationFn: async (data: HouseholdFormData) => {
      return await apiRequest("POST", "/api/households", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Household created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create household",
        variant: "destructive",
      });
    },
  });

  // Update household mutation
  const updateHouseholdMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<HouseholdFormData> }) => {
      return await apiRequest("PUT", `/api/households/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setIsEditDialogOpen(false);
      setSelectedHousehold(null);
      toast({
        title: "Success",
        description: "Household updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update household",
        variant: "destructive",
      });
    },
  });

  // Delete household mutation
  const deleteHouseholdMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/households/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      toast({
        title: "Success",
        description: "Household deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete household",
        variant: "destructive",
      });
    },
  });

  // Form for create/edit
  const form = useForm<HouseholdFormData>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: HouseholdFormData) => {
    if (selectedHousehold) {
      updateHouseholdMutation.mutate({ id: selectedHousehold.id, data });
    } else {
      createHouseholdMutation.mutate(data);
    }
  };

  const handleEdit = (household: Household) => {
    setSelectedHousehold(household);
    form.reset({
      name: household.name,
      primaryContactClientId: household.primaryContactClientId || undefined,
      description: household.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (household: Household) => {
    setSelectedHousehold(household);
    setIsDetailsDialogOpen(true);
  };

  const handleDelete = (household: Household) => {
    if (confirm(`Are you sure you want to delete the household "${household.name}"?`)) {
      deleteHouseholdMutation.mutate(household.id);
    }
  };

  const getPrimaryContactName = (household: Household) => {
    if (!household.primaryContactClientId || !clientsData?.clients) return "Not set";
    const client = clientsData.clients.find(c => c.id === household.primaryContactClientId);
    return client ? `${client.firstName} ${client.lastName}` : "Not found";
  };

  const households = householdsData?.households || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar currentView="households" />
      
      <div className="lg:ml-64">
        <TopBar title="Household Management" subtitle="Organize clients into family units and view their collective portfolio" />
        
        <main className="p-6">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search households..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setSelectedHousehold(null);
                  form.reset({ name: "", description: "" });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Household
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Household</DialogTitle>
                  <DialogDescription>
                    Create a new household to group family members together.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Household Name</FormLabel>
                          <FormControl>
                            <Input placeholder="The Smith Family" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primaryContactClientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact (Optional)</FormLabel>
                          <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select primary contact" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clientsData?.clients.map((client) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.firstName} {client.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Family details or notes..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createHouseholdMutation.isPending}>
                        {createHouseholdMutation.isPending ? "Creating..." : "Create Household"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Households Grid */}
          {isLoadingHouseholds ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : households.length === 0 ? (
            <Card className="p-8 text-center">
              <Home className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Households Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "No households match your search criteria." : "Get started by creating your first household."}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Household
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {households.map((household) => (
                <Card key={household.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-blue-600" />
                        {household.name}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Primary Contact: {getPrimaryContactName(household)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {household.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{household.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Created: {new Date(household.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(household)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(household)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(household)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Household</DialogTitle>
                <DialogDescription>
                  Update household information.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Household Name</FormLabel>
                        <FormControl>
                          <Input placeholder="The Smith Family" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primaryContactClientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact (Optional)</FormLabel>
                        <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select primary contact" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clientsData?.clients.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.firstName} {client.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Family details or notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={updateHouseholdMutation.isPending}>
                      {updateHouseholdMutation.isPending ? "Updating..." : "Update Household"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Details Dialog */}
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  {selectedHousehold?.name} - Family Overview
                </DialogTitle>
                <DialogDescription>
                  View all family members and their associated accounts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Household Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Household Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>Name:</strong> {selectedHousehold?.name}</div>
                    <div><strong>Primary Contact:</strong> {selectedHousehold ? getPrimaryContactName(selectedHousehold) : "N/A"}</div>
                    {selectedHousehold?.description && (
                      <div><strong>Description:</strong> {selectedHousehold.description}</div>
                    )}
                    <div><strong>Created:</strong> {selectedHousehold ? new Date(selectedHousehold.createdAt).toLocaleDateString() : "N/A"}</div>
                  </CardContent>
                </Card>

                {/* Family Members */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Family Members ({householdClients?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {householdClients && householdClients.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {householdClients.map((client) => (
                          <div key={client.id} className="p-3 border rounded-lg">
                            <div className="font-medium">{client.firstName} {client.lastName}</div>
                            <div className="text-sm text-gray-600">{client.email}</div>
                            <div className="text-sm text-gray-500">Client ID: {client.id}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No family members assigned to this household yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Associated Accounts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Associated Accounts ({householdAccounts?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {householdAccounts && householdAccounts.length > 0 ? (
                      <div className="space-y-3">
                        {householdAccounts.map((account) => (
                          <div key={account.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{account.accountType} - {account.programType}</div>
                                <div className="text-sm text-gray-600">{account.registrationType}</div>
                                <div className="text-sm text-gray-500">Account ID: {account.id}</div>
                              </div>
                              <Badge variant={account.status === 'Active' ? 'default' : 'secondary'}>
                                {account.status || 'Active'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No accounts associated with this household yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}