"""
Verification script for ML Service setup
Checks that all required files and configurations are in place
"""
import sys
from pathlib import Path
from typing import List, Tuple

def check_item(name: str, condition: bool) -> Tuple[bool, str]:
    """Check a single item and return status"""
    status = "[OK]" if condition else "[FAIL]"
    return condition, f"{status} {name}"

def verify_setup() -> bool:
    """Verify ML service setup"""
    print("=" * 60)
    print("SeeMe ML Service - Setup Verification")
    print("=" * 60)
    print()

    checks: List[Tuple[bool, str]] = []
    base_path = Path(__file__).parent

    # Check Python version
    py_version = sys.version_info
    py_ok = py_version >= (3, 10)
    checks.append(check_item(
        f"Python version ({py_version.major}.{py_version.minor}.{py_version.micro})",
        py_ok
    ))

    # Check directory structure
    checks.append(check_item("src/ directory exists", (base_path / "src").exists()))
    checks.append(check_item("scripts/ directory exists", (base_path / "scripts").exists()))
    checks.append(check_item("models/ directory exists", (base_path / "models").exists()))
    checks.append(check_item("logs/ directory exists", (base_path / "logs").exists()))
    checks.append(check_item("venv/ directory exists", (base_path / "venv").exists()))

    # Check configuration files
    checks.append(check_item("requirements.txt exists", (base_path / "requirements.txt").exists()))
    checks.append(check_item(".env.ml exists", (base_path / ".env.ml").exists()))
    checks.append(check_item(".gitignore exists", (base_path / ".gitignore").exists()))

    # Check source files
    checks.append(check_item("src/main.py exists", (base_path / "src" / "main.py").exists()))
    checks.append(check_item("src/config.py exists", (base_path / "src" / "config.py").exists()))
    checks.append(check_item("src/celery_app.py exists", (base_path / "src" / "celery_app.py").exists()))
    checks.append(check_item("src/models/loader.py exists", (base_path / "src" / "models" / "loader.py").exists()))
    checks.append(check_item("src/tasks/process_image.py exists", (base_path / "src" / "tasks" / "process_image.py").exists()))

    # Check scripts
    checks.append(check_item("scripts/download_models.py exists", (base_path / "scripts" / "download_models.py").exists()))

    # Check startup scripts
    checks.append(check_item("setup.ps1 exists", (base_path / "setup.ps1").exists()))
    checks.append(check_item("setup.bat exists", (base_path / "setup.bat").exists()))
    checks.append(check_item("start_server.ps1 exists", (base_path / "start_server.ps1").exists()))
    checks.append(check_item("start_server.bat exists", (base_path / "start_server.bat").exists()))
    checks.append(check_item("start_worker.ps1 exists", (base_path / "start_worker.ps1").exists()))
    checks.append(check_item("start_worker.bat exists", (base_path / "start_worker.bat").exists()))

    # Print results
    print("File Structure:")
    print("-" * 60)
    for passed, message in checks:
        print(message)

    print()
    print("=" * 60)
    passed_count = sum(1 for passed, _ in checks if passed)
    total_count = len(checks)
    all_passed = passed_count == total_count

    if all_passed:
        print(f"SUCCESS: All checks passed ({passed_count}/{total_count})")
        print("=" * 60)
        print()
        print("Next Steps:")
        print("  1. Run setup: .\\setup.ps1  OR  setup.bat")
        print("  2. Start server: .\\start_server.ps1")
        print("  3. Start worker: .\\start_worker.ps1")
        print()
    else:
        print(f"FAILURE: Some checks failed ({passed_count}/{total_count})")
        print("=" * 60)

    return all_passed

if __name__ == "__main__":
    success = verify_setup()
    sys.exit(0 if success else 1)
