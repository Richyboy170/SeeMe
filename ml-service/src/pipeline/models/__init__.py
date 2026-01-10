"""
Model architectures for face processing pipeline
"""

from .bisenet import BiSeNet
try:
    from .bisenet_pretrained import BiSeNet as BiSeNetPretrained
    __all__ = ['BiSeNet', 'BiSeNetPretrained']
except ImportError:
    __all__ = ['BiSeNet']
