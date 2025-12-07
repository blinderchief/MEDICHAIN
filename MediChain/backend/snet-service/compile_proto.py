#!/usr/bin/env python
"""
Proto Compilation Script for MediChain SNET Service

Generates Python gRPC stubs from medichain.proto
"""

import subprocess
import sys
from pathlib import Path


def compile_protos():
    """Compile .proto files to Python stubs."""
    
    proto_dir = Path(__file__).parent
    proto_file = proto_dir / "medichain.proto"
    
    if not proto_file.exists():
        print(f"Error: {proto_file} not found")
        sys.exit(1)
    
    print(f"Compiling {proto_file}...")
    
    # Run grpc_tools.protoc
    cmd = [
        sys.executable, "-m", "grpc_tools.protoc",
        f"-I{proto_dir}",
        f"--python_out={proto_dir}",
        f"--grpc_python_out={proto_dir}",
        str(proto_file)
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("Successfully generated:")
        print(f"  - {proto_dir}/medichain_pb2.py")
        print(f"  - {proto_dir}/medichain_pb2_grpc.py")
        
        # Fix import in grpc file (common issue)
        grpc_file = proto_dir / "medichain_pb2_grpc.py"
        if grpc_file.exists():
            content = grpc_file.read_text()
            # Fix relative import
            content = content.replace(
                "import medichain_pb2",
                "from . import medichain_pb2"
            )
            grpc_file.write_text(content)
            print("Fixed imports in medichain_pb2_grpc.py")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"Error compiling protos: {e.stderr}")
        return False
    except FileNotFoundError:
        print("Error: grpc_tools not installed")
        print("Install with: pip install grpcio-tools")
        return False


if __name__ == "__main__":
    success = compile_protos()
    sys.exit(0 if success else 1)
