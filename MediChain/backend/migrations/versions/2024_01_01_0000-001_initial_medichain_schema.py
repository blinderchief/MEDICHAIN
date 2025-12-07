"""Initial MediChain schema

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension for vector similarity search
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Create patients table
    op.create_table(
        'patients',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('clerk_user_id', sa.String(length=255), nullable=False),
        sa.Column('did', sa.String(length=255), nullable=True),
        sa.Column('encrypted_pii', sa.Text(), nullable=True),
        sa.Column('encrypted_phi', sa.Text(), nullable=True),
        sa.Column('semantic_hash', sa.String(length=64), nullable=True),
        sa.Column('demographics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('medications', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('lab_results', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('embedding_model', sa.String(length=100), nullable=True),
        sa.Column('preferences', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('wallet_address', sa.String(length=42), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create indexes for patients
    op.create_index('ix_patients_clerk_user_id', 'patients', ['clerk_user_id'], unique=True)
    op.create_index('ix_patients_did', 'patients', ['did'], unique=True)
    op.create_index('ix_patients_semantic_hash', 'patients', ['semantic_hash'])
    op.create_index('ix_patients_wallet_address', 'patients', ['wallet_address'])
    
    # Create trials table
    op.create_table(
        'trials',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('nct_id', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('official_title', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('detailed_description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('phase', sa.String(length=50), nullable=True),
        sa.Column('study_type', sa.String(length=50), nullable=True),
        sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('interventions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('eligibility_criteria', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('locations', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('contacts', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('sponsor', sa.String(length=255), nullable=True),
        sa.Column('enrollment_count', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('completion_date', sa.Date(), nullable=True),
        sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('embedding_model', sa.String(length=100), nullable=True),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create indexes for trials
    op.create_index('ix_trials_nct_id', 'trials', ['nct_id'], unique=True)
    op.create_index('ix_trials_status', 'trials', ['status'])
    op.create_index('ix_trials_phase', 'trials', ['phase'])
    
    # GIN index for JSONB full-text search
    op.execute('''
        CREATE INDEX ix_trials_conditions_gin ON trials 
        USING GIN (conditions jsonb_path_ops)
    ''')
    
    # Create matches table
    op.create_table(
        'matches',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('patient_id', sa.Uuid(), nullable=False),
        sa.Column('trial_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('confidence_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('eligibility_score', sa.Float(), nullable=True),
        sa.Column('location_score', sa.Float(), nullable=True),
        sa.Column('preference_score', sa.Float(), nullable=True),
        sa.Column('reasoning', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ai_explanation', sa.Text(), nullable=True),
        sa.Column('matched_criteria', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('unmatched_criteria', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('consent_hash', sa.String(length=66), nullable=True),
        sa.Column('consent_tx_hash', sa.String(length=66), nullable=True),
        sa.Column('consent_signed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('asi_reward_amount', sa.Float(), nullable=True),
        sa.Column('asi_reward_tx_hash', sa.String(length=66), nullable=True),
        sa.Column('created_by', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['trial_id'], ['trials.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create indexes for matches
    op.create_index('ix_matches_patient_id', 'matches', ['patient_id'])
    op.create_index('ix_matches_trial_id', 'matches', ['trial_id'])
    op.create_index('ix_matches_status', 'matches', ['status'])
    op.create_index('ix_matches_confidence', 'matches', ['confidence_score'])
    op.create_unique_constraint('uq_matches_patient_trial', 'matches', ['patient_id', 'trial_id'])
    
    # Create updated_at trigger function
    op.execute('''
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    ''')
    
    # Add triggers for updated_at
    for table in ['patients', 'trials', 'matches']:
        op.execute(f'''
            CREATE TRIGGER update_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ''')


def downgrade() -> None:
    # Drop triggers
    for table in ['patients', 'trials', 'matches']:
        op.execute(f'DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table}')
    
    op.execute('DROP FUNCTION IF EXISTS update_updated_at_column()')
    
    # Drop tables in reverse order
    op.drop_table('matches')
    op.drop_table('trials')
    op.drop_table('patients')
    
    # Drop extension
    op.execute('DROP EXTENSION IF EXISTS vector')
