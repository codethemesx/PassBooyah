
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🔄 Testando conexão com Prisma...');
  try {
      const count = await prisma.user.count();
      console.log(`✅ Conexão BEM SUCEDIDA!`);
      console.log(`📊 Total de usuários no banco: ${count}`);
      
      const admin = await prisma.user.findUnique({
          where: { email: 'admin@example.com' }
      });

      if (admin) {
          console.log(`✅ Usuário Admin encontrado: ${admin.email}`);
          console.log(`🔑 Senha Hash (primeiros 10 chars): ${admin.password.substring(0, 10)}...`);
      } else {
          console.error(`❌ Usuário Admin NÃO encontrado!`);
      }

  } catch (e) {
      console.error('❌ ERRO DE CONEXÃO:', e);
  } finally {
      await prisma.$disconnect();
  }
}

main();
