import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  History as HistoryIcon, 
  Search, 
  Filter,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react";

interface Scan {
  id: string;
  target: string;
  asset_type: string;
  status: string;
  threat_level: string;
  created_at: string;
  completed_at: string;
  results: any;
  metadata: any;
}

const History = () => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [filteredScans, setFilteredScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [threatFilter, setThreatFilter] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchScans();
    
    // Setup real-time subscription for scans
    const channel = supabase
      .channel('scan-history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scans'
        },
        (payload) => {
          console.log('Real-time scan update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setScans(prev => [payload.new as Scan, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setScans(prev => 
              prev.map(scan => 
                scan.id === payload.new.id ? payload.new as Scan : scan
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterScans();
  }, [scans, searchTerm, statusFilter, threatFilter]);

  const fetchScans = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);
    } catch (error) {
      console.error('Error fetching scans:', error);
      toast({
        title: "Error",
        description: "Failed to load scan history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterScans = () => {
    let filtered = scans;

    if (searchTerm) {
      filtered = filtered.filter(scan =>
        scan.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scan.asset_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(scan => scan.status === statusFilter);
    }

    if (threatFilter !== "all") {
      filtered = filtered.filter(scan => scan.threat_level === threatFilter);
    }

    setFilteredScans(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const viewScanDetails = (scanId: string) => {
    navigate(`/scan-details/${scanId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <HistoryIcon className="w-8 h-8 text-primary" />
              Scan History
            </h1>
            <p className="text-muted-foreground">
              View and manage your reconnaissance scan history
            </p>
          </div>
          <Button onClick={() => navigate('/scan')}>
            <Target className="w-4 h-4 mr-2" />
            New Scan
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search targets or asset types..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={threatFilter} onValueChange={setThreatFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Threat Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Threats</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Scan List */}
        <div className="space-y-4">
          {filteredScans.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <HistoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No scans found</h3>
                <p className="text-muted-foreground mb-4">
                  {scans.length === 0 
                    ? "Start your first reconnaissance scan to see results here"
                    : "No scans match your current filters"
                  }
                </p>
                {scans.length === 0 && (
                  <Button onClick={() => navigate('/scan')}>
                    Start First Scan
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredScans.map((scan) => (
              <Card key={scan.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(scan.status)}
                        <div>
                          <h3 className="font-semibold">{scan.target}</h3>
                          <p className="text-sm text-muted-foreground">
                            {scan.asset_type} scan
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Started: {formatDate(scan.created_at)}
                        </div>
                        {scan.completed_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Completed: {formatDate(scan.completed_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary"
                        className="capitalize"
                      >
                        {scan.status}
                      </Badge>
                      
                      <Badge className={`${getThreatLevelColor(scan.threat_level)} text-white`}>
                        {scan.threat_level} Risk
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewScanDetails(scan.id)}
                        disabled={scan.status !== 'completed'}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default History;