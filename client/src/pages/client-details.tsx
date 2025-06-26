import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Sidebar from "@/components/sidebar";

export default function ClientDetails() {
  const { id } = useParams();
  
  const { data: client, isLoading: clientLoading, error: clientError } = useQuery({
    queryKey: [`/api/clients/${id}`],
    enabled: !!id,
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: [`/api/accounts/by-client/${id}`],
    enabled: !!id,
  });

  if (clientLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar currentView="clients" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading client details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (clientError || !client) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar currentView="clients" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">Client Not Found</h2>
            <p className="text-muted-foreground mt-2">The client you're looking for doesn't exist.</p>
            <Link to="/clients">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentView="clients" />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/clients">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Clients
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {client.firstName} {client.lastName}
                </h1>
                <p className="text-muted-foreground">Client ID: {client.id}</p>
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
        </div>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
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
                      <label className="text-sm font-medium text-slate-600">SSN</label>
                      <p className="text-slate-800">{client.ssn || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Date of Birth</label>
                      <p className="text-slate-800">{client.dateOfBirth || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Citizenship</label>
                      <p className="text-slate-800">{client.citizenship || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Residency Status</label>
                      <p className="text-slate-800">{client.residencyStatus || "N/A"}</p>
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
                  <div className="grid grid-cols-2 gap-4">
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
                      <label className="text-sm font-medium text-slate-600">Business Phone</label>
                      <p className="text-slate-800">{client.businessPhone || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Legal Address</label>
                    <p className="text-slate-800">
                      {client.legalAddress ? (
                        <>
                          {client.legalAddress}<br />
                          {client.legalCity}, {client.legalState} {client.legalZip}
                        </>
                      ) : "N/A"}
                    </p>
                  </div>
                  {client.mailingAddress && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Mailing Address</label>
                      <p className="text-slate-800">
                        {client.mailingAddress}<br />
                        {client.mailingCity}, {client.mailingState} {client.mailingZip}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Employment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800">
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
                    <div>
                      <label className="text-sm font-medium text-slate-600">Occupation</label>
                      <p className="text-slate-800">{client.occupation || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Employer</label>
                      <p className="text-slate-800">{client.employer || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800">
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

              {/* Trusted Contact */}
              {client.trustedContactName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-slate-800">
                      Trusted Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600">Name</label>
                        <p className="text-slate-800">{client.trustedContactName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Relationship</label>
                        <p className="text-slate-800">{client.trustedContactRelationship || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Phone</label>
                        <p className="text-slate-800">{client.trustedContactPhone || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Email</label>
                        <p className="text-slate-800">{client.trustedContactEmail || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Associated Accounts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center justify-between">
                  Associated Accounts
                  <Badge variant="secondary">
                    {accounts?.length || 0} Account{accounts?.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {accounts && accounts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account ID</TableHead>
                          <TableHead>Account Type</TableHead>
                          <TableHead>Program Type</TableHead>
                          <TableHead>Registration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">#{account.id}</TableCell>
                            <TableCell>{account.accountType || "N/A"}</TableCell>
                            <TableCell>{account.programType || "N/A"}</TableCell>
                            <TableCell>{account.registrationType || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={account.status === 'Active' ? 'default' : 'secondary'}>
                                {account.status || "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>No accounts found for this client.</p>
                    <Link to={`/account-form-enhanced?clientId=${client.id}`} className="mt-4 inline-block">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Account
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}