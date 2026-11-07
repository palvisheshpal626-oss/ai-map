// lib/crm/pipeline-service.ts
// Sales CRM & Lead Acquisition Pipeline Service
// Tracks stages: lead -> contacted -> audit_sent -> proposal_shared -> demo_booked -> won / lost
// Maintains audit logs, timestamped notes, and status transitions for outreach campaigns.

import { Restaurant } from '../types';

export type CrmStage =
  | 'lead'
  | 'contacted'
  | 'audit_sent'
  | 'proposal_shared'
  | 'demo_booked'
  | 'won'
  | 'lost';

export interface CrmNote {
  id: string;
  timestamp: string;
  text: string;
  author: string;
  stageAtTime: CrmStage;
}

export interface CrmStageTransition {
  fromStage: CrmStage;
  toStage: CrmStage;
  timestamp: string;
  note?: string;
  actor?: string;
}

export interface CrmLeadRecord {
  restaurantId: string;
  businessName: string;
  stage: CrmStage;
  phone?: string | null;
  websiteUrl?: string | null;
  opportunityCode?: string;
  notes: CrmNote[];
  history: CrmStageTransition[];
  updatedAt: string;
  createdAt: string;
}

// In-memory CRM store for active session with persistence synchronization
class CrmPipelineManager {
  private leads = new Map<string, CrmLeadRecord>();

  getLead(restaurantId: string): CrmLeadRecord | undefined {
    return this.leads.get(restaurantId);
  }

  getAllLeads(): CrmLeadRecord[] {
    return Array.from(this.leads.values());
  }

  getLeadsByStage(stage: CrmStage): CrmLeadRecord[] {
    return this.getAllLeads().filter(l => l.stage === stage);
  }

  initLead(restaurant: Partial<Restaurant>): CrmLeadRecord {
    const id = restaurant.id || `rest-${Date.now()}`;
    const existing = this.leads.get(id);
    if (existing) return existing;

    const initialStage: CrmStage = restaurant.crm_status || 'lead';
    const now = new Date().toISOString();

    const record: CrmLeadRecord = {
      restaurantId: id,
      businessName: restaurant.business_name || 'Restaurant',
      stage: initialStage,
      phone: restaurant.phone_number || null,
      websiteUrl: restaurant.website_url || null,
      opportunityCode: restaurant.opportunity?.categoryCode || 'A',
      notes: [],
      history: [
        {
          fromStage: initialStage,
          toStage: initialStage,
          timestamp: now,
          note: 'Lead initialized from discovery engine',
        },
      ],
      updatedAt: now,
      createdAt: now,
    };

    this.leads.set(id, record);
    return record;
  }

  updateStage(
    restaurantId: string,
    newStage: CrmStage,
    noteText?: string,
    actor: string = 'User'
  ): CrmLeadRecord {
    let lead = this.leads.get(restaurantId);
    const now = new Date().toISOString();

    if (!lead) {
      lead = {
        restaurantId,
        businessName: 'Restaurant',
        stage: 'lead',
        notes: [],
        history: [],
        updatedAt: now,
        createdAt: now,
      };
      this.leads.set(restaurantId, lead);
    }

    const prevStage = lead.stage;
    lead.stage = newStage;
    lead.updatedAt = now;

    lead.history.push({
      fromStage: prevStage,
      toStage: newStage,
      timestamp: now,
      note: noteText,
      actor,
    });

    if (noteText) {
      lead.notes.push({
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
        text: noteText,
        author: actor,
        stageAtTime: newStage,
      });
    }

    return lead;
  }

  addNote(
    restaurantId: string,
    text: string,
    author: string = 'User'
  ): CrmNote {
    let lead = this.leads.get(restaurantId);
    const now = new Date().toISOString();

    if (!lead) {
      lead = this.initLead({ id: restaurantId });
    }

    const note: CrmNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      text,
      author,
      stageAtTime: lead.stage,
    };

    lead.notes.push(note);
    lead.updatedAt = now;
    return note;
  }

  getStageCounts(): Record<CrmStage, number> {
    const counts: Record<CrmStage, number> = {
      lead: 0,
      contacted: 0,
      audit_sent: 0,
      proposal_shared: 0,
      demo_booked: 0,
      won: 0,
      lost: 0,
    };

    for (const lead of this.leads.values()) {
      if (counts[lead.stage] !== undefined) {
        counts[lead.stage]++;
      }
    }

    return counts;
  }

  clear() {
    this.leads.clear();
  }
}

export const crmPipeline = new CrmPipelineManager();
