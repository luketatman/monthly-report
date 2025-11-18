import { useState, useEffect } from "react";
import { Region } from "@/entities/Region";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, Building2, Globe, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RegionalStructure() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRegions = async () => {
      setLoading(true);
      setError(null);
      try {
        const regionsData = await Region.list();
        // Sort regions alphabetically for consistent order
        regionsData.sort((a, b) => a.name.localeCompare(b.name));
        setRegions(regionsData);
      } catch (e) {
        console.error("Failed to fetch regions:", e);
        setError("Could not load regional data. Please check your connection or if the Region entity has data.");
      } finally {
        setLoading(false);
      }
    };

    fetchRegions();
  }, []);

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="shadow-md">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Regional & Office Structure</h1>
                    <p className="text-slate-600">A complete list of all regions and their associated offices.</p>
                </div>
            </div>
            <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        ) : regions.length === 0 ? (
            <Card className="text-center p-8 border-dashed">
                <CardHeader>
                    <CardTitle>No Regions Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mt-2 text-slate-600">There is no data in the 'Region' entity. Please add regions and their markets via the Data tab in the base44 dashboard.</p>
                </CardContent>
            </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {regions.map((region) => (
              <Card key={region.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-slate-200 flex flex-col">
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle className="flex items-center gap-3 text-slate-800">
                    <Map className="w-6 h-6 text-blue-600" />
                    <span>{region.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 flex-1">
                  {region.markets && region.markets.length > 0 ? (
                    <ul className="space-y-2">
                      {region.markets.sort().map((market) => (
                        <li key={market} className="flex items-center gap-3 p-2 rounded-md bg-white hover:bg-slate-50 transition-colors">
                          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                          <span className="text-slate-700 font-medium">{market}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-500 text-center italic p-4">No offices listed for this region.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}