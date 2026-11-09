#!/usr/bin/env python3
"""
AlShams Craft Studio - Background Removal Service
Powered by rembg (github.com/danielgatis/rembg)
Engineered for ستوديو الشمساوية
"""

import sys
import os
import json
import base64
import time
import io
import argparse
from pathlib import Path
from PIL import Image

try:
    import rembg
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

# Cache sessions to avoid repeated ONNX initialization
_SESSIONS = {}

def get_session(model_name="u2net"):
    if not REMBG_AVAILABLE:
        return None
    if model_name not in _SESSIONS:
        try:
            _SESSIONS[model_name] = rembg.new_session(model_name)
        except Exception as e:
            # Fallback to u2netp if specified model fails
            print(f"[Warn] Failed to init {model_name}: {e}. Trying u2netp...", file=sys.stderr)
            try:
                _SESSIONS[model_name] = rembg.new_session("u2netp")
            except Exception as e2:
                print(f"[Error] Failed to init fallback session: {e2}", file=sys.stderr)
                _SESSIONS[model_name] = None
    return _SESSIONS[model_name]

def process_single_image(
    image_data,
    model_name="u2net",
    alpha_matting=False,
    af=240,
    ab=10,
    ae=10,
    only_mask=False,
    post_process_mask=False,
    bgcolor=None
):
    """
    Processes an image using rembg and returns output image bytes and execution stats.
    image_data can be bytes or PIL.Image
    """
    start_time = time.time()
    
    if isinstance(image_data, bytes):
        input_image = Image.open(io.BytesIO(image_data))
        original_size_bytes = len(image_data)
    else:
        input_image = image_data
        img_byte_arr = io.BytesIO()
        input_image.save(img_byte_arr, format='PNG')
        original_size_bytes = len(img_byte_arr.getvalue())

    orig_w, orig_h = input_image.size
    orig_format = input_image.format or "PNG"

    session = get_session(model_name)
    
    kwargs = {
        "session": session,
        "alpha_matting": bool(alpha_matting),
        "alpha_matting_foreground_threshold": int(af),
        "alpha_matting_background_threshold": int(ab),
        "alpha_matting_erode_size": int(ae),
        "only_mask": bool(only_mask),
        "post_process_mask": bool(post_process_mask)
    }

    if bgcolor:
        try:
            if isinstance(bgcolor, str):
                parts = [int(p.strip()) for p in bgcolor.split(",")]
                kwargs["bgcolor"] = tuple(parts)
            elif isinstance(bgcolor, (list, tuple)):
                kwargs["bgcolor"] = tuple(bgcolor)
        except Exception:
            pass

    # Perform background removal
    output_image = rembg.remove(input_image, **kwargs)

    # Convert to PNG bytes
    out_buf = io.BytesIO()
    output_image.save(out_buf, format="PNG", optimize=True)
    out_bytes = out_buf.getvalue()
    
    duration_ms = int((time.time() - start_time) * 1000)
    out_w, out_h = output_image.size

    return {
        "success": True,
        "image_bytes": out_bytes,
        "original_width": orig_w,
        "original_height": orig_h,
        "output_width": out_w,
        "output_height": out_h,
        "original_size_bytes": original_size_bytes,
        "output_size_bytes": len(out_bytes),
        "processing_time_ms": duration_ms,
        "model_used": model_name,
        "alpha_matting_applied": alpha_matting
    }

def main():
    parser = argparse.ArgumentParser(description="AlShams Studio rembg Processor")
    parser.add_argument("--json", action="store_true", help="Process JSON payload from stdin")
    parser.add_argument("--input", type=str, help="Input image file path")
    parser.add_argument("--output", type=str, help="Output image file path")
    parser.add_argument("--model", type=str, default="u2net", help="rembg model name (u2net, u2netp, silueta, isnet-general-use)")
    parser.add_argument("--alpha-matting", action="store_true", help="Enable alpha matting")
    parser.add_argument("--af", type=int, default=240, help="Alpha matting foreground threshold")
    parser.add_argument("--ab", type=int, default=10, help="Alpha matting background threshold")
    parser.add_argument("--ae", type=int, default=10, help="Alpha matting erode size")
    parser.add_argument("--only-mask", action="store_true", help="Output only the binary/alpha mask")
    parser.add_argument("--post-process-mask", action="store_true", help="Post-process mask")
    parser.add_argument("--bgcolor", type=str, default=None, help="Background color R,G,B or R,G,B,A")
    parser.add_argument("--batch-dir", type=str, help="Batch directory of images")
    parser.add_argument("--output-dir", type=str, help="Batch output directory")
    parser.add_argument("--export-csv", type=str, help="Path to write CSV report")

    args = parser.parse_args()

    # JSON stdin mode for seamless Node.js IPC
    if args.json:
        try:
            raw_input = sys.stdin.read()
            if not raw_input.strip():
                print(json.dumps({"success": False, "error": "Empty input"}), flush=True)
                return
            payload = json.loads(raw_input)
            
            # Extract base64 image
            image_b64 = payload.get("image")
            if not image_b64:
                print(json.dumps({"success": False, "error": "Missing image property"}), flush=True)
                return
            
            if "," in image_b64:
                image_b64 = image_b64.split(",", 1)[1]
            
            img_bytes = base64.b64decode(image_b64)
            res = process_single_image(
                img_bytes,
                model_name=payload.get("model", "u2net"),
                alpha_matting=payload.get("alphaMatting", False),
                af=payload.get("af", 240),
                ab=payload.get("ab", 10),
                ae=payload.get("ae", 10),
                only_mask=payload.get("onlyMask", False),
                post_process_mask=payload.get("postProcessMask", False),
                bgcolor=payload.get("bgcolor", None)
            )

            # Convert result image to base64
            res["output_base64"] = "data:image/png;base64," + base64.b64encode(res.pop("image_bytes")).decode("utf-8")
            print(json.dumps(res), flush=True)
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}), flush=True)
        return

    # Batch directory mode
    if args.batch_dir:
        input_path = Path(args.batch_dir)
        if not input_path.exists():
            print(f"Error: directory {args.batch_dir} does not exist", file=sys.stderr)
            sys.exit(1)
            
        out_dir = Path(args.output_dir or (input_path / "alshams_processed"))
        out_dir.mkdir(parents=True, exist_ok=True)
        
        valid_exts = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}
        images = [p for p in input_path.iterdir() if p.suffix.lower() in valid_exts]
        
        reports = []
        print(f"Starting batch of {len(images)} images with model {args.model}...")

        for idx, img_path in enumerate(images):
            try:
                with open(img_path, "rb") as f:
                    b = f.read()
                result = process_single_image(
                    b,
                    model_name=args.model,
                    alpha_matting=args.alpha_matting,
                    af=args.af,
                    ab=args.ab,
                    ae=args.ae,
                    only_mask=args.only_mask,
                    post_process_mask=args.post_process_mask,
                    bgcolor=args.bgcolor
                )
                
                out_file_name = f"{img_path.stem}_nobg.png"
                out_path = out_dir / out_file_name
                with open(out_path, "wb") as f_out:
                    f_out.write(result["image_bytes"])
                
                report_item = {
                    "filename": img_path.name,
                    "input_path": str(img_path.resolve()),
                    "output_path": str(out_path.resolve()),
                    "status": "COMPLETED",
                    "original_size_kb": round(result["original_size_bytes"] / 1024, 2),
                    "output_size_kb": round(result["output_size_bytes"] / 1024, 2),
                    "original_dims": f"{result['original_width']}x{result['original_height']}",
                    "output_dims": f"{result['output_width']}x{result['output_height']}",
                    "time_ms": result["processing_time_ms"],
                    "model": result["model_used"]
                }
                reports.append(report_item)
                print(f"[{idx+1}/{len(images)}] Processed {img_path.name} in {result['processing_time_ms']}ms -> {out_path.name}")
            except Exception as ex:
                reports.append({
                    "filename": img_path.name,
                    "input_path": str(img_path.resolve()),
                    "output_path": "",
                    "status": f"ERROR: {str(ex)}",
                    "original_size_kb": 0,
                    "output_size_kb": 0,
                    "original_dims": "-",
                    "output_dims": "-",
                    "time_ms": 0,
                    "model": args.model
                })
                print(f"[{idx+1}/{len(images)}] Error processing {img_path.name}: {ex}", file=sys.stderr)

        # Export CSV if requested
        if args.export_csv or True:
            csv_path = Path(args.export_csv or (out_dir / "processing_report.csv"))
            import csv
            with open(csv_path, "w", newline="", encoding="utf-8-sig") as f_csv:
                writer = csv.DictWriter(f_csv, fieldnames=[
                    "filename", "status", "original_size_kb", "output_size_kb",
                    "original_dims", "output_dims", "time_ms", "model",
                    "input_path", "output_path"
                ])
                writer.writeheader()
                writer.writerows(reports)
            print(f"Report exported to {csv_path}")
        return

    # Single file mode
    if args.input and args.output:
        with open(args.input, "rb") as f:
            b = f.read()
        res = process_single_image(
            b,
            model_name=args.model,
            alpha_matting=args.alpha_matting,
            af=args.af,
            ab=args.ab,
            ae=args.ae,
            only_mask=args.only_mask,
            post_process_mask=args.post_process_mask,
            bgcolor=args.bgcolor
        )
        with open(args.output, "wb") as f_out:
            f_out.write(res["image_bytes"])
        print(f"Processed {args.input} -> {args.output} ({res['processing_time_ms']}ms)")
        return

    parser.print_help()

if __name__ == "__main__":
    main()
