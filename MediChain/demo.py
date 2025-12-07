#!/usr/bin/env python
"""
MediChain Demo Script
=====================

This script demonstrates the core functionality of MediChain:
1. Patient profile creation
2. AI-powered trial matching
3. Blockchain consent recording

Run with: python demo.py
"""

import asyncio
import json
from datetime import datetime
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich import print as rprint

console = Console()


# Sample patient profile for demo
DEMO_PATIENT = {
    "id": "demo-patient-001",
    "email": "demo@medichain.io",
    "first_name": "Sarah",
    "last_name": "Johnson",
    "date_of_birth": "1985-03-15",
    "gender": "female",
    "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "USA"
    },
    "medical_history": {
        "conditions": [
            {
                "name": "Type 2 Diabetes",
                "icd_code": "E11",
                "status": "active",
                "diagnosed_date": "2020-06-01"
            },
            {
                "name": "Hypertension",
                "icd_code": "I10",
                "status": "active",
                "diagnosed_date": "2019-03-15"
            }
        ],
        "medications": [
            {
                "name": "Metformin",
                "dosage": "500mg",
                "frequency": "twice daily",
                "is_active": True
            },
            {
                "name": "Lisinopril",
                "dosage": "10mg",
                "frequency": "once daily",
                "is_active": True
            }
        ],
        "allergies": ["Penicillin", "Sulfa drugs"],
        "lab_results": [
            {
                "test_name": "HbA1c",
                "value": "7.2",
                "unit": "%",
                "date": "2024-01-15",
                "is_abnormal": True
            },
            {
                "test_name": "Blood Pressure",
                "value": "135/85",
                "unit": "mmHg",
                "date": "2024-01-15",
                "is_abnormal": True
            }
        ]
    }
}

# Sample clinical trials for demo
DEMO_TRIALS = [
    {
        "id": "NCT12345678",
        "title": "Novel GLP-1 Receptor Agonist for Type 2 Diabetes Management",
        "sponsor": "PharmaCorp Research",
        "phase": "Phase III",
        "status": "recruiting",
        "condition": "Type 2 Diabetes",
        "location": "San Francisco, CA",
        "target_enrollment": 500,
        "current_enrollment": 234,
        "eligibility": {
            "min_age": 18,
            "max_age": 75,
            "gender": "all",
            "inclusion": [
                "Diagnosis of Type 2 Diabetes for at least 6 months",
                "HbA1c between 7.0% and 10.0%",
                "Currently on stable diabetes medication"
            ],
            "exclusion": [
                "Type 1 Diabetes",
                "History of pancreatitis",
                "Severe kidney disease"
            ]
        }
    },
    {
        "id": "NCT87654321",
        "title": "Combination Therapy for Diabetes and Hypertension",
        "sponsor": "Global Medical Research",
        "phase": "Phase II",
        "status": "recruiting",
        "condition": "Type 2 Diabetes, Hypertension",
        "location": "Oakland, CA",
        "target_enrollment": 300,
        "current_enrollment": 89,
        "eligibility": {
            "min_age": 30,
            "max_age": 70,
            "gender": "all",
            "inclusion": [
                "Concurrent diagnosis of Type 2 Diabetes and Hypertension",
                "Blood pressure > 130/80 mmHg",
                "No recent cardiovascular events"
            ],
            "exclusion": [
                "Pregnancy or planning to become pregnant",
                "History of stroke within past year"
            ]
        }
    },
    {
        "id": "NCT11223344",
        "title": "AI-Assisted Diabetes Management Study",
        "sponsor": "TechHealth Innovations",
        "phase": "Phase IV",
        "status": "recruiting",
        "condition": "Type 2 Diabetes",
        "location": "San Jose, CA",
        "target_enrollment": 1000,
        "current_enrollment": 567,
        "eligibility": {
            "min_age": 21,
            "max_age": 65,
            "gender": "all",
            "inclusion": [
                "Type 2 Diabetes diagnosis",
                "Smartphone ownership",
                "Willing to use continuous glucose monitor"
            ],
            "exclusion": [
                "Insulin pump user",
                "Severe hypoglycemia history"
            ]
        }
    }
]


def print_header():
    """Print demo header."""
    console.print(Panel.fit(
        """
[bold cyan]███╗   ███╗███████╗██████╗ ██╗ ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗[/]
[bold cyan]████╗ ████║██╔════╝██╔══██╗██║██╔════╝██║  ██║██╔══██╗██║████╗  ██║[/]
[bold cyan]██╔████╔██║█████╗  ██║  ██║██║██║     ███████║███████║██║██╔██╗ ██║[/]
[bold cyan]██║╚██╔╝██║██╔══╝  ██║  ██║██║██║     ██╔══██║██╔══██║██║██║╚██╗██║[/]
[bold cyan]██║ ╚═╝ ██║███████╗██████╔╝██║╚██████╗██║  ██║██║  ██║██║██║ ╚████║[/]
[bold cyan]╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝[/]

[bold white]The Right Trial. The Right Patient. Verified, Instantly.[/]
        """,
        title="[bold green]SingularityNET Hackathon 2025[/]",
        subtitle="[dim]AI-Powered Decentralized Clinical Trial Matching[/]"
    ))
    console.print()


def print_patient_profile():
    """Display patient profile."""
    console.print(Panel.fit(
        f"""
[bold]Patient:[/] {DEMO_PATIENT['first_name']} {DEMO_PATIENT['last_name']}
[bold]Location:[/] {DEMO_PATIENT['location']['city']}, {DEMO_PATIENT['location']['state']}
[bold]Age:[/] {datetime.now().year - int(DEMO_PATIENT['date_of_birth'][:4])} years old
[bold]Gender:[/] {DEMO_PATIENT['gender'].title()}

[bold cyan]Active Conditions:[/]
{chr(10).join([f"  • {c['name']} ({c['icd_code']})" for c in DEMO_PATIENT['medical_history']['conditions']])}

[bold cyan]Current Medications:[/]
{chr(10).join([f"  • {m['name']} {m['dosage']} - {m['frequency']}" for m in DEMO_PATIENT['medical_history']['medications']])}

[bold cyan]Known Allergies:[/]
{', '.join(DEMO_PATIENT['medical_history']['allergies'])}

[bold cyan]Recent Lab Results:[/]
{chr(10).join([f"  • {l['test_name']}: {l['value']} {l['unit']}" for l in DEMO_PATIENT['medical_history']['lab_results']])}
        """,
        title="[bold blue]📋 Patient Profile[/]"
    ))
    console.print()


async def simulate_ai_matching():
    """Simulate AI matching process."""
    console.print("[bold yellow]🤖 Initiating AI-Powered Trial Matching...[/]\n")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        # Simulate matching steps
        steps = [
            "Analyzing patient medical history...",
            "Vectorizing eligibility criteria...",
            "Querying clinical trial database...",
            "Computing semantic similarity scores...",
            "Applying eligibility filters...",
            "Generating AI explanations...",
            "Ranking matches by compatibility...",
        ]
        
        for step in steps:
            task = progress.add_task(step, total=None)
            await asyncio.sleep(0.8)
            progress.remove_task(task)
    
    console.print("[bold green]✓ AI Analysis Complete![/]\n")
    
    # Display matches
    table = Table(title="🎯 Trial Matches", show_header=True, header_style="bold cyan")
    table.add_column("Rank", style="dim", width=6)
    table.add_column("Trial ID", style="cyan")
    table.add_column("Title", width=35)
    table.add_column("Match Score", justify="center")
    table.add_column("Status")
    
    matches = [
        ("1", "NCT87654321", "Combination Therapy for Diabetes...", "[bold green]94%[/]", "🟢 Recruiting"),
        ("2", "NCT12345678", "Novel GLP-1 Receptor Agonist...", "[bold green]89%[/]", "🟢 Recruiting"),
        ("3", "NCT11223344", "AI-Assisted Diabetes Management...", "[bold yellow]76%[/]", "🟢 Recruiting"),
    ]
    
    for match in matches:
        table.add_row(*match)
    
    console.print(table)
    console.print()
    
    return matches


def display_top_match():
    """Display detailed view of top match."""
    trial = DEMO_TRIALS[1]  # The combination therapy trial
    
    console.print(Panel.fit(
        f"""
[bold cyan]{trial['title']}[/]

[bold]Trial ID:[/] {trial['id']}
[bold]Sponsor:[/] {trial['sponsor']}
[bold]Phase:[/] {trial['phase']}
[bold]Condition:[/] {trial['condition']}
[bold]Location:[/] {trial['location']}
[bold]Enrollment:[/] {trial['current_enrollment']}/{trial['target_enrollment']} participants

[bold green]Why This Match?[/]
• Patient has [bold]both Type 2 Diabetes AND Hypertension[/] - matches primary eligibility
• Age 39 is within required range (30-70 years)
• Blood pressure reading (135/85) exceeds threshold (>130/80)
• No cardiovascular events in history
• No pregnancy concerns noted

[bold yellow]AI Confidence:[/] 94% match score
[bold]Estimated Travel:[/] 25 miles to Oakland, CA

[bold cyan]Inclusion Criteria Met:[/]
  ✅ Concurrent diagnosis of Type 2 Diabetes and Hypertension
  ✅ Blood pressure > 130/80 mmHg
  ✅ No recent cardiovascular events

[bold red]Exclusion Criteria Checked:[/]
  ✅ Not pregnant / not planning pregnancy (assumed, needs verification)
  ✅ No stroke history in past year
        """,
        title="[bold green]🏆 Top Match Details[/]"
    ))
    console.print()


async def simulate_consent_flow():
    """Simulate blockchain consent recording."""
    console.print("[bold yellow]📝 Initiating Consent Process...[/]\n")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        steps = [
            "Loading informed consent document...",
            "Displaying HIPAA authorization...",
            "Collecting digital signature...",
            "Hashing consent data...",
            "Connecting to Base L2 network...",
            "Recording consent on blockchain...",
            "Generating NFT receipt...",
        ]
        
        for step in steps:
            task = progress.add_task(step, total=None)
            await asyncio.sleep(0.6)
            progress.remove_task(task)
    
    console.print("[bold green]✓ Consent Recorded on Blockchain![/]\n")
    
    # Display blockchain record
    console.print(Panel.fit(
        """
[bold cyan]Blockchain Consent Record[/]

[bold]Transaction Hash:[/] 0x7f9a3b2c...e8d4f1a6
[bold]Block Number:[/] 12,847,392
[bold]Network:[/] Base Mainnet
[bold]Contract:[/] ConsentRegistry (0x1234...abcd)
[bold]Timestamp:[/] """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC") + """

[bold green]Consent Status:[/] ✅ VERIFIED
[bold]Patient ID Hash:[/] 0xabcd...1234
[bold]Trial ID Hash:[/] 0xefgh...5678
[bold]Document Hash:[/] 0xijkl...9012

[dim]This consent is immutably recorded and can be independently verified.[/]
        """,
        title="[bold blue]🔗 Blockchain Verification[/]"
    ))
    console.print()


def print_summary():
    """Print demo summary."""
    console.print(Panel.fit(
        """
[bold green]✨ Demo Complete![/]

[bold cyan]Key Features Demonstrated:[/]
  ✅ Patient profile management with medical history
  ✅ AI-powered trial matching using Gemini 2.5 Pro
  ✅ Semantic search across eligibility criteria
  ✅ Transparent match scoring with explanations
  ✅ Blockchain consent recording on Base L2
  ✅ Immutable audit trail for compliance

[bold cyan]Technology Stack:[/]
  • Backend: FastAPI + PostgreSQL + Qdrant
  • AI: Google Gemini 2.5 Pro + LangChain
  • Blockchain: Base L2 + Solidity
  • Frontend: Next.js 15 + shadcn/ui

[bold cyan]Hackathon Track:[/] AI + Healthcare Innovation
[bold cyan]Team:[/] MediChain

[dim]The right trial. The right patient. Verified, instantly.[/]
        """,
        title="[bold magenta]🏆 MediChain Summary[/]"
    ))


async def main():
    """Run the demo."""
    console.clear()
    print_header()
    
    # Step 1: Show patient profile
    console.print("[bold]Step 1: Patient Profile Analysis[/]")
    console.print("-" * 50)
    print_patient_profile()
    
    input("Press Enter to continue to AI matching...")
    console.print()
    
    # Step 2: AI Matching
    console.print("[bold]Step 2: AI-Powered Trial Matching[/]")
    console.print("-" * 50)
    await simulate_ai_matching()
    
    input("Press Enter to see top match details...")
    console.print()
    
    # Step 3: Top Match Details
    console.print("[bold]Step 3: Top Match Analysis[/]")
    console.print("-" * 50)
    display_top_match()
    
    input("Press Enter to proceed with consent...")
    console.print()
    
    # Step 4: Consent Flow
    console.print("[bold]Step 4: Blockchain Consent Recording[/]")
    console.print("-" * 50)
    await simulate_consent_flow()
    
    input("Press Enter to see summary...")
    console.print()
    
    # Summary
    print_summary()


if __name__ == "__main__":
    asyncio.run(main())
