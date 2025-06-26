import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import AccountModal from "@/components/modals/account-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Lock } from "lucide-react";

export default function Accounts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

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

  const { data: accountsData, isLoading: accountsLoading, refetch } = useQuery({
    queryKey: ["/api/accounts", { search, accountType: accountType === "all" ? undefined : accountType }],
    enabled: isAuthenticated,
  });

  // Query for user's draft accounts
  const { data: draftAccounts, isLoading: draftsLoading } = useQuery({
    queryKey: ["/api/draft-accounts"],
    enabled: isAuthenticated,
    retry: false,
  });

  const openModal = (account?: any) => {
    setSelectedAccount(account || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedAccount(null);
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    refetch();
    closeModal();
    toast({
      title: "Success!",
      description: `Account has been ${selectedAccount ? 'updated' : 'created'} successfully.`,
    });
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
                              <Button variant="ghost" size="sm">
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
    </div>
  );
}
