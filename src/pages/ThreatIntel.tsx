import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  Calendar, 
  Tag,
  ExternalLink,
  Database,
  Filter,
  TrendingUp
} from "lucide-react";

interface ThreatIntelligence {
  id: string;
  ioc_value: string;
  ioc_type: string;
  threat_level: string;
  description: string;
  source: string;
  tags: string[];
  first_seen: string;
  last_seen: string;
  metadata: any;
}

const ThreatIntel = () => {
  const [threats, setThreats] = useState<ThreatIntelligence[]>([]);
  const [filteredThreats, setFilteredThreats] = useState<ThreatIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [threatFilter, setThreatFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchThreats();
  }, []);

  useEffect(() => {
    filterThreats();
  }, [threats, searchTerm, typeFilter, threatFilter, sourceFilter]);

  const fetchThreats = async () => {
    try {
      const { data, error } = await supabase
        .from('threat_intelligence')
        .select('*')
        .eq('is_active', true)
        .order('last_seen', { ascending: false });

      if (error) throw error;
      setThreats(data || []);
    } catch (error) {
      console.error('Error fetching threats:', error);
      toast({
        title: "Error",
        description: "Failed to load threat intelligence",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterThreats = () => {
    let filtered = threats;

    if (searchTerm) {
      filtered = filtered.filter(threat =>
        threat.ioc_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        threat.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        threat.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(threat => threat.ioc_type === typeFilter);
    }

    if (threatFilter !== "all") {
      filtered = filtered.filter(threat => threat.threat_level === threatFilter);
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter(threat => threat.source === sourceFilter);
    }

    setFilteredThreats(filtered);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip': return '🌐';
      case 'domain': return '🏠';
      case 'url': return '🔗';
      case 'hash': return '#';
      case 'email': return '📧';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUniqueValues = (field: keyof ThreatIntelligence) => {
    return [...new Set(threats.map(threat => threat[field] as string))].filter(Boolean);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Database className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Threat Intelligence
          </h1>
          <p className="text-muted-foreground">
            Monitor and analyze threat indicators and intelligence feeds
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total IOCs</p>
                  <p className="text-2xl font-bold">{threats.length}</p>
                </div>
                <Database className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-500">
                    {threats.filter(t => t.threat_level === 'critical').length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {threats.filter(t => t.threat_level === 'high').length}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sources</p>
                  <p className="text-2xl font-bold">{getUniqueValues('source').length}</p>
                </div>
                <ExternalLink className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search IOCs, descriptions, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="IOC Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {getUniqueValues('ioc_type').map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={threatFilter} onValueChange={setThreatFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Threat Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {getUniqueValues('source').map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Threat List */}
        <div className="space-y-4">
          {filteredThreats.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No threat intelligence found</h3>
                <p className="text-muted-foreground">
                  {threats.length === 0 
                    ? "No threat intelligence data available"
                    : "No threats match your current filters"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredThreats.map((threat) => (
              <Card key={threat.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTypeIcon(threat.ioc_type)}</span>
                        <div>
                          <h3 className="font-mono font-semibold">{threat.ioc_value}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {threat.ioc_type} indicator
                          </p>
                        </div>
                      </div>
                      
                      {threat.description && (
                        <p className="text-sm">{threat.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                          Source: {threat.source}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          First seen: {formatDate(threat.first_seen)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Last seen: {formatDate(threat.last_seen)}
                        </div>
                      </div>

                      {threat.tags && threat.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {threat.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${getThreatLevelColor(threat.threat_level)} text-white`}>
                        {threat.threat_level}
                      </Badge>
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

export default ThreatIntel;