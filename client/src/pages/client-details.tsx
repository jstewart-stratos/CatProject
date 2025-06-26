import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Eye, Edit, Trash2 } from "lucide-react";
import Sidebar from "@/components/sidebar";

export default function ClientDetails() {
  const params = useParams();
  const [, navigate] = useLocation();
  const clientId = parseInt(params.id || "0");

  // Fetch client data
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Fetch accounts data
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/accounts"],
  });

  const client = (clientsData as any)?.clients?.find((c: any) => c.id === clientId);
  const clientAccounts = (accountsData as any)?.accounts?.filter((a: any) => a.clientId === clientId) || [];

  if (clientsLoading || accountsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar currentView="clients" />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              <div className="h-64 bg-slate-200 rounded"></div>
              <div className="h-48 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar currentView="clients" />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-16">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">Client Not Found</h2>
              <p className="text-slate-600 mb-6">The client you're looking for doesn't exist.</p>
              <Link to="/clients">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Clients
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentView="clients" />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/clients">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Clients
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  {client.firstName} {client.lastName}
                </h1>
                <p className="text-slate-600">Client ID: {client.id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link to={`/account-form-enhanced?clientId=${client.id}`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </Link>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Button>
            </div>
          </div>

          {/* Client Information Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">First Name</label>
                    <p className="text-slate-800">{client.firstName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Last Name</label>
                    <p className="text-slate-800">{client.lastName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Date of Birth</label>
                    <p className="text-slate-800">
                      {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">SSN</label>
                    <p className="text-slate-800">{client.ssn || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Client Type</label>
                    <p className="text-slate-800">{client.clientType || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Citizenship</label>
                    <p className="text-slate-800">{client.citizenship || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <p className="text-slate-800">{client.email || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Home Phone</label>
                  <p className="text-slate-800">{client.homePhone || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Mobile Phone</label>
                  <p className="text-slate-800">{client.mobilePhone || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Legal Address</label>
                  <p className="text-slate-800">
                    {client.legalAddress1 && (
                      <>
                        {client.legalAddress1}
                        {client.legalAddress2 && <>, {client.legalAddress2}</>}
                        <br />
                        {client.city}, {client.state} {client.zip}
                      </>
                    ) || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Employment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium text-slate-800">
                  Employment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Employment Status</label>
                    <p className="text-slate-800">{client.employmentStatus || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Industry</label>
                    <p className="text-slate-800">{client.industry || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-slate-600">Occupation</label>
                    <p className="text-slate-800">{client.occupation || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium text-slate-800">
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Annual Income</label>
                    <p className="text-slate-800">{client.annualIncome || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Tax Bracket</label>
                    <p className="text-slate-800">{client.taxBracket || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Net Worth</label>
                    <p className="text-slate-800">{client.netWorth || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Liquid Net Worth</label>
                    <p className="text-slate-800">{client.liquidNetWorth || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Associated Accounts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Associated Accounts ({clientAccounts.length})
                </CardTitle>
                <Link to={`/account-form-enhanced?clientId=${client.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {clientAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-4">No accounts found for this client.</p>
                  <Link to={`/account-form-enhanced?clientId=${client.id}`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Account
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account ID</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead>Program Type</TableHead>
                        <TableHead>Registration Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientAccounts.map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">#{account.id}</TableCell>
                          <TableCell>{account.accountType}</TableCell>
                          <TableCell>{account.programType}</TableCell>
                          <TableCell>{account.registrationType}</TableCell>
                          <TableCell>
                            <Badge variant={account.isLocked ? "destructive" : "default"}>
                              {account.isLocked ? "Locked" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}