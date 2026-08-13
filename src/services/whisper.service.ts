import { pipeline } from '@huggingface/transformers';

let transcriber: any = null;
let loadingPromise: Promise<any> | null = null;

export async function loadWhisper() {
    if (transcriber) {
        return transcriber;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    console.log('Loading Whisper...');

    loadingPromise = pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-medium',
        {
            dtype: 'fp32',
        },
    )
        .then((model) => {
            console.log('Whisper loaded successfully');

            transcriber = model;

            return model;
        })
        .catch((error) => {
            console.error('Whisper loading failed:', error);

            // خیلی مهم: اجازه بده دفعه بعد دوباره تلاش شود
            loadingPromise = null;
            transcriber = null;

            throw error;
        });

    return loadingPromise;
}