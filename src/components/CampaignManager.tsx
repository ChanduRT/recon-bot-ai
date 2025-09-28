import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, Zap, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface CampaignManagerProps {
  campaign: any;
  scans: any[];
  attackPaths: any[];
  onCampaignUpdate: () => void;
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({
  campaign,
  scans,
  attackPaths,
  onCampaignUpdate
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const generateAttackPlan = async () => {
    if (!campaign?.id || scans.length === 0) {
      toast({
        title: "Cannot Generate Plan",
        description: "Please ensure campaign is selected and scans are available",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const scanIds = scans.map(scan => scan.id);
      
      const { data, error } = await supabase.functions.invoke('ai-attack-planner', {
        body: { 
          campaignId: campaign.id,
          scanIds: scanIds
        }
      });

      if (error) throw error;

      toast({
        title: "Attack Plan Generated",
        description: `Created ${data.attackPaths} attack paths using AI analysis`
      });

      onCampaignUpdate();
    } catch (error) {
      console.error('Error generating attack plan:', error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startCampaign = async () => {
    setIsExecuting(true);
    try {
      const { error } = await supabase
        .from('apt_campaigns')
        .update({ 
          status: 'active',
          start_date: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Campaign Started",
        description: "APT simulation is now active"
      });

      onCampaignUpdate();
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast({
        title: "Start Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const pauseCampaign = async () => {
    try {
      const { error } = await supabase
        .from('apt_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Campaign Paused",
        description: "All attack activities have been paused"
      });

      onCampaignUpdate();
    } catch (error) {
      console.error('Error pausing campaign:', error);
    }
  };

  const completeCampaign = async () => {
    try {
      const { error } = await supabase
        .from('apt_campaigns')
        .update({ 
          status: 'completed',
          end_date: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Campaign Completed",
        description: "APT simulation has been marked as complete"
      });

      onCampaignUpdate();
    } catch (error) {
      console.error('Error completing campaign:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-secondary';
      case 'active': return 'bg-primary';
      case 'paused': return 'bg-warning';
      case 'completed': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <Clock className="h-4 w-4" />;
      case 'active': return <Play className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const calculateProgress = () => {
    if (!attackPaths.length) return 0;
    const completed = attackPaths.filter(path => path.status === 'completed').length;
    return (completed / attackPaths.length) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(campaign.status)}
              Campaign Control Center
            </CardTitle>
            <CardDescription>
              Manage campaign lifecycle and attack execution
            </CardDescription>
          </div>
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status?.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{scans.length}</div>
            <div className="text-sm text-muted-foreground">Available Scans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{attackPaths.length}</div>
            <div className="text-sm text-muted-foreground">Attack Paths</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{calculateProgress().toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Progress</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Campaign Progress</span>
            <span>{calculateProgress().toFixed(1)}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-2">
          {campaign.status === 'planning' && (
            <>
              <Button 
                onClick={generateAttackPlan}
                disabled={isGenerating || scans.length === 0}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate AI Attack Plan'}
              </Button>
              {attackPaths.length > 0 && (
                <Button 
                  onClick={startCampaign}
                  disabled={isExecuting}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Campaign
                </Button>
              )}
            </>
          )}

          {campaign.status === 'active' && (
            <>
              <Button 
                onClick={pauseCampaign}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause Campaign
              </Button>
              <Button 
                onClick={completeCampaign}
                variant="default"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Complete Campaign
              </Button>
            </>
          )}

          {campaign.status === 'paused' && (
            <>
              <Button 
                onClick={startCampaign}
                disabled={isExecuting}
                variant="default"
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Resume Campaign
              </Button>
              <Button 
                onClick={completeCampaign}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Complete Campaign
              </Button>
            </>
          )}
        </div>

        {campaign.status === 'planning' && attackPaths.length === 0 && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Generate an AI-powered attack plan based on your scan results to begin the simulation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};