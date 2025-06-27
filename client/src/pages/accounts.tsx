import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import AccountModal from "@/components/modals/account-modal";
import AccountDetailsModal from "@/components/modals/account-details-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Lock, Trash2, Filter } from "lucide-react";

export default function Accounts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<any>(null);

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

  const { data: accountsData, isLoading: accountsLoading, refetch } = useQuery({
    queryKey: ["/api/accounts", { 
      search, 
      accountType: accountType === "all" ? undefined : accountType,
      groupId: selectedGroupId !== "all" ? selectedGroupId : undefined 
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (accountType !== "all") params.set('accountType', accountType);
      if (selectedGroupId !== "all") params.set('groupId', selectedGroupId);
      const queryString = params.toString();
      const url = `/api/accounts${queryString ? `?${queryString}` : ''}`;
      console.log('Accounts frontend making request to:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Debug logging
  console.log('Accounts page - Current filters:', { 
    selectedGroupId, 
    search, 
    accountType,
    userRole: userData?.role,
    groupsAvailable: groupsData?.length || 0
  });

  // Query for user's draft accounts
  const { data: draftAccounts, isLoading: draftsLoading, refetch: refetchDrafts } = useQuery({
    queryKey: ["/api/draft-accounts"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      return await apiRequest("DELETE", `/api/draft-accounts/${draftId}`);
    },
    onSuccess: () => {
      refetchDrafts();
      toast({
        title: "Success!",
        description: "Draft account deleted successfully.",
      });
    },
    onError: (error: Error) => {
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
        description: "Failed to delete draft account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openModal = (account?: any) => {
    setSelectedAccount(account || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedAccount(null);
    setIsModalOpen(false);
  };

  const openDetailsModal = (account: any) => {
    setSelectedAccountForDetails(account);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAccountForDetails(null);
  };

  const handleEditFromDetails = (account: any) => {
    closeDetailsModal();
    openModal(account);
  };

  const handleModalSuccess = () => {
    refetch();
    closeModal();
    toast({
      title: "Success!",
      description: `Account has been ${selectedAccount ? 'updated' : 'created'} successfully.`,
    });
  };

  const handleDeleteDraft = (draftId: number) => {
    if (confirm("Are you sure you want to delete this draft account? This action cannot be undone.")) {
      deleteDraftMutation.mutate(draftId);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView="accounts" />
      <div className="ml-64">
        <TopBar 
          title="Account Management" 
          subtitle="Track and manage client accounts"
        />
        
        <div className="p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Account Management</CardTitle>
              <div className="flex items-center space-x-3">
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Account Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Account Types</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Joint">Joint</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="Trust">Trust</SelectItem>
                  </SelectContent>
                </Select>
                <Link to="/account-form-enhanced">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </Link>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Search and Filter Section */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search accounts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Group Filter - Only show for transitions specialists */}
                {userData?.role === 'transition_specialist' && groupsData && (
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by group" />
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
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading accounts...
                        </TableCell>
                      </TableRow>
                    ) : accountsData?.accounts?.length > 0 ? (
                      accountsData.accounts.map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="text-sm font-medium text-slate-800">
                              ACC-{account.id}
                            </div>
                            <div className="text-sm text-slate-500">
                              {account.programType || 'Investment Program'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-xs">
                                  {account.client?.firstName?.[0]}{account.client?.lastName?.[0]}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-slate-800">
                                  {account.client?.firstName} {account.client?.lastName}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {account.accountType || 'Individual'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            ${account.approximateAccountValue ? Number(account.approximateAccountValue).toLocaleString() : '0'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                              {account.status || 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => openDetailsModal(account)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openModal(account)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Lock className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Draft Accounts Section */}
          {draftAccounts && draftAccounts.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Draft Accounts
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Continue working on your saved account drafts
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Draft Name</TableHead>
                        <TableHead>Current Section</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draftAccounts.map((draft: any) => (
                        <TableRow key={draft.id}>
                          <TableCell>
                            <div className="text-sm font-medium text-slate-800">
                              {draft.draftName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {draft.currentSection === "accountInfo" ? "Account Information" :
                               draft.currentSection === "achInfo" ? "ACH Information" :
                               draft.currentSection === "additionalHolders" ? "Additional Holders" :
                               draft.currentSection === "beneficiaries" ? "Beneficiaries" :
                               draft.currentSection === "tradingAuthority" ? "Trading Authority" :
                               draft.currentSection === "tradingOptions" ? "Trading Options" :
                               draft.currentSection === "directOutsideBusiness" ? "Direct/Outside Business" :
                               draft.currentSection === "plan529Disclosure" ? "529 Plan Disclosure" :
                               draft.currentSection === "powerOfAttorney" ? "Power of Attorney" :
                               draft.currentSection === "accountOptions" ? "Account Options" :
                               draft.currentSection || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-600">
                              {new Date(draft.lastModified).toLocaleDateString()} at{" "}
                              {new Date(draft.lastModified).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Link to={`/account-form-enhanced?draftId=${draft.id}`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4 mr-1" />
                                  Continue
                                </Button>
                              </Link>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteDraft(draft.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <AccountModal
        isOpen={isModalOpen}
        onClose={closeModal}
        account={selectedAccount}
        onSuccess={handleModalSuccess}
      />
      
      <AccountDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        account={selectedAccountForDetails}
        onEdit={handleEditFromDetails}
      />
    </div>
  );
}
