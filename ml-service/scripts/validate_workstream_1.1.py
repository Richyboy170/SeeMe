"""
Validation Script for WORKSTREAM 1.1
Checks that all files are in place and code structure is correct
"""

import os
import sys
from pathlib import Path


def check_file_exists(file_path, description):
    """Check if a file exists"""
    if os.path.exists(file_path):
        print(f"[OK] {description}")
        return True
    else:
        print(f"[FAIL] {description} - NOT FOUND: {file_path}")
        return False


def check_directory_exists(dir_path, description):
    """Check if a directory exists"""
    if os.path.isdir(dir_path):
        print(f"[OK] {description}")
        return True
    else:
        print(f"[FAIL] {description} - NOT FOUND: {dir_path}")
        return False


def count_lines(file_path):
    """Count lines in a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return len(f.readlines())
    except:
        return 0


def validate_python_syntax(file_path):
    """Check if Python file has valid syntax"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            compile(f.read(), file_path, 'exec')
        return True
    except SyntaxError as e:
        print(f"  [FAIL] Syntax error: {e}")
        return False


def main():
    print("=" * 60)
    print("WORKSTREAM 1.1 VALIDATION")
    print("=" * 60)

    # Get project root
    script_dir = Path(__file__).parent
    ml_service_dir = script_dir.parent

    os.chdir(ml_service_dir)

    results = []

    print("\n=== Directory Structure ===")
    results.append(check_directory_exists("src/pipeline", "Pipeline directory"))
    results.append(check_directory_exists("src/pipeline/models", "Models directory"))
    results.append(check_directory_exists("tests", "Tests directory"))
    results.append(check_directory_exists("scripts", "Scripts directory"))

    print("\n=== Core Pipeline Files ===")
    pipeline_files = [
        ("src/pipeline/__init__.py", "Pipeline __init__.py"),
        ("src/pipeline/exceptions.py", "Exception classes"),
        ("src/pipeline/face_detection.py", "Face Detection (Task 1.1.1)"),
        ("src/pipeline/face_parsing.py", "Face Parsing (Task 1.1.2)"),
        ("src/pipeline/face_extraction.py", "Face Extraction (Task 1.1.3)"),
    ]

    for file_path, desc in pipeline_files:
        exists = check_file_exists(file_path, desc)
        results.append(exists)
        if exists:
            lines = count_lines(file_path)
            print(f"  Lines: {lines}")
            if validate_python_syntax(file_path):
                print(f"  [OK] Syntax valid")
            else:
                results.append(False)

    print("\n=== Model Files ===")
    model_files = [
        ("src/pipeline/models/__init__.py", "Models __init__.py"),
        ("src/pipeline/models/bisenet.py", "BiSeNet architecture"),
    ]

    for file_path, desc in model_files:
        exists = check_file_exists(file_path, desc)
        results.append(exists)
        if exists:
            lines = count_lines(file_path)
            print(f"  Lines: {lines}")
            if validate_python_syntax(file_path):
                print(f"  [OK] Syntax valid")
            else:
                results.append(False)

    print("\n=== Test Files ===")
    test_files = [
        ("tests/test_face_detection.py", "Unit tests"),
        ("tests/test_pipeline_e2e.py", "End-to-end tests"),
    ]

    for file_path, desc in test_files:
        exists = check_file_exists(file_path, desc)
        results.append(exists)
        if exists:
            lines = count_lines(file_path)
            print(f"  Lines: {lines}")
            if validate_python_syntax(file_path):
                print(f"  [OK] Syntax valid")
            else:
                results.append(False)

    print("\n=== Scripts ===")
    results.append(check_file_exists("scripts/download_bisenet.py", "BiSeNet download script"))

    print("\n=== Documentation ===")
    doc_files = [
        ("src/pipeline/README.md", "Pipeline README"),
        ("WORKSTREAM_1.1_SUMMARY.md", "Workstream summary"),
        ("QUICKSTART_1.1.md", "Quick start guide"),
    ]

    for file_path, desc in doc_files:
        results.append(check_file_exists(file_path, desc))

    print("\n=== Dependencies ===")
    requirements_file = "requirements.txt"
    if check_file_exists(requirements_file, "requirements.txt"):
        with open(requirements_file, 'r') as f:
            content = f.read()
            deps = ['scipy', 'mediapipe', 'torch', 'opencv-python', 'numpy']
            for dep in deps:
                if dep in content:
                    print(f"  [OK] {dep} in requirements.txt")
                    results.append(True)
                else:
                    print(f"  [FAIL] {dep} NOT in requirements.txt")
                    results.append(False)

    print("\n=== Code Quality Checks ===")

    # Check for proper imports in __init__.py
    init_file = "src/pipeline/__init__.py"
    with open(init_file, 'r') as f:
        content = f.read()
        classes = ['FaceDetector', 'FaceParser', 'FaceExtractor']
        for cls in classes:
            if cls in content:
                print(f"  [OK] {cls} exported from __init__.py")
                results.append(True)
            else:
                print(f"  [FAIL] {cls} NOT exported from __init__.py")
                results.append(False)

    # Check for exception classes
    exc_file = "src/pipeline/exceptions.py"
    with open(exc_file, 'r') as f:
        content = f.read()
        exceptions = [
            'FaceProcessingError',
            'NoFaceDetectedError',
            'TooManyFacesError',
            'FaceTooSmallError',
            'FaceAngleTooExtremeError'
        ]
        for exc in exceptions:
            if exc in content:
                print(f"  [OK] {exc} defined")
                results.append(True)
            else:
                print(f"  [FAIL] {exc} NOT defined")
                results.append(False)

    # Summary
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0

    print(f"VALIDATION RESULTS: {passed}/{total} checks passed ({percentage:.1f}%)")
    print("=" * 60)

    if percentage == 100:
        print("[SUCCESS] WORKSTREAM 1.1 IMPLEMENTATION COMPLETE")
        print("\nAll files present and valid!")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Run unit tests: python tests/test_face_detection.py")
        print("3. Test with image: python tests/test_pipeline_e2e.py image.jpg")
        return 0
    else:
        print("[WARNING]  SOME CHECKS FAILED")
        print("\nPlease review the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
