import { useState, useEffect } from "react";
import { FinancialData, Region, MonthlySubmission, OfficeSubmission } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileSpreadsheet, 
  Building2, 
  Users, 
  Database,
  Home
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import FinancialUpload from "../components/admin/FinancialUpload";
import RegionManagement from "../components/admin/RegionManagement";
import SubmissionTracking from "../components/admin/SubmissionTracking";
import DataExport from "../components/admin/DataExport";
import HistoricalDataUpload from "../components/admin/HistoricalDataUpload";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [officeSubmissions, setOfficeSubmissions] = useState([]);
  const [financialData, setFinancialData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [regionsData, submissionsData, officeSubmissionsData, financialDataResult] = await Promise.all([
        Region.list(),
        MonthlySubmission.list("-created_date", 1000),
        OfficeSubmission.list("-created_date", 1000),
        FinancialData.list("-created_date", 1000)
      ]);

      setRegions(regionsData);
      setSubmissions(submissionsData);
      setOfficeSubmissions(officeSubmissionsData);
      setFinancialData(financialDataResult);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadAdminData();
  };

  if (loading) {
    return (
      <div className="p-8 bg-slate-800 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-600 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-slate-600 rounded"></div>
              <div className="h-32 bg-slate-600 rounded"></div>
              <div className="h-32 bg-slate-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-800 min-h-screen text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => navigate(createPageUrl('Dashboard'))}
              variant="outline"
              className="bg-white/90 hover:bg-white border-slate-300 text-slate-700 hover:text-slate-900"
            >
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-300 mt-1">Manage system data and configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-600 bg-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Total Regions</p>
                  <p className="text-2xl font-bold text-white">{regions.length}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-600 bg-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">This Month's Submissions</p>
                  <p className="text-2xl font-bold text-white">
                    {submissions.filter(s => s.month === new Date().toISOString().slice(0, 7)).length}
                  </p>
                </div>
                <FileSpreadsheet className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-600 bg-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Financial Records</p>
                  <p className="text-2xl font-bold text-white">{financialData.length}</p>
                </div>
                <Database className="w-8 h-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-700 shadow-sm">
            <TabsTrigger value="financial" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:font-semibold px-3 py-1.5 text-sm font-medium justify-center whitespace-nowrap rounded-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm">
              <FileSpreadsheet className="w-4 h-4" />
              Financial Data
            </TabsTrigger>
            <TabsTrigger value="regions" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:font-semibold px-3 py-1.5 text-sm font-medium justify-center whitespace-nowrap rounded-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm">
              <Building2 className="w-4 h-4" />
              Regions
            </TabsTrigger>
            <TabsTrigger value="submissions" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:font-semibold px-3 py-1.5 text-sm font-medium justify-center whitespace-nowrap rounded-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm">
              <Users className="w-4 h-4" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:font-semibold px-3 py-1.5 text-sm font-medium justify-center whitespace-nowrap rounded-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm">
              <Database className="w-4 h-4" />
              Export Data
            </TabsTrigger>
            <TabsTrigger value="historical" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:font-semibold px-3 py-1.5 text-sm font-medium justify-center whitespace-nowrap rounded-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm">
              <Upload className="w-4 h-4" />
              Historical
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="mt-6">
            <FinancialUpload onDataUploaded={refreshData} />
          </TabsContent>

          <TabsContent value="regions" className="mt-6">
            <RegionManagement 
              regions={regions} 
              onRegionsUpdated={refreshData}
            />
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            <SubmissionTracking 
              submissions={submissions}
              regions={regions}
              onSubmissionsUpdated={refreshData}
            />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <DataExport 
              submissions={submissions}
              officeSubmissions={officeSubmissions}
              financialData={financialData}
              regions={regions}
            />
          </TabsContent>

          <TabsContent value="historical" className="mt-6">
            <HistoricalDataUpload onDataUploaded={refreshData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
